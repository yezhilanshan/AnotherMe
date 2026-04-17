from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError
from sqlalchemy.engine import Connection
from unittest.mock import patch

import api_gateway.db as db_module
from api_gateway.app import create_app
from api_gateway.config import Settings
from api_gateway.db import init_db, reconfigure_db, session_scope
from api_gateway.job_service import (
    _run_problem_video_generate,
    create_or_get_job,
    fail_jobs_with_missing_input_objects,
    handle_worker_message,
    purge_prestart_nonterminal_jobs,
    reconcile_single_running_problem_video_job_with_artifacts,
)
from api_gateway.models import Job, JobArtifact
from api_gateway.queueing import QueueMessage
from api_gateway.schemas import CreateJobRequest, JobType, validate_job_payload
from api_gateway.storage import LocalObjectStorage
from api_gateway.anotherme_executor import MissingInputObjectError, ProblemVideoExecutionResult


class FakeQueueClient:
    def __init__(self):
        self.items = []
        self.dead_letters = []

    def enqueue(self, queue_name, message):
        self.items.append((queue_name, message))

    def push_dead_letter(self, dlq_name, message):
        self.dead_letters.append((dlq_name, message))

    def ping(self):
        return True


def test_validate_payload_defaults():
    payload = validate_job_payload(
        JobType.COURSE_GENERATE,
        {
            "requirement": "讲解二次函数",
        },
    )
    assert payload["language"] == "zh-CN"
    assert payload["options"]["enable_web_search"] is False

    payload2 = validate_job_payload(
        JobType.PROBLEM_VIDEO_GENERATE,
        {
            "image_object_key": "uploads/a.png",
        },
    )
    assert payload2["output_profile"] == "1080p"


def test_idempotent_job_creation(tmp_path: Path):
    db_path = tmp_path / "jobs.db"
    reconfigure_db(f"sqlite:///{db_path}")
    init_db()

    settings = Settings(
        database_url=f"sqlite:///{db_path}",
        redis_url="redis://unused",
        local_storage_root=str(tmp_path / "obj"),
    )

    req = CreateJobRequest(
        job_type=JobType.COURSE_GENERATE,
        payload={"requirement": "牛顿定律课程"},
        user_id="u1",
    )

    with session_scope() as session:
        job1, created1 = create_or_get_job(session, req, settings)
        session.flush()
        job2, created2 = create_or_get_job(session, req, settings)
        session.flush()

        assert created1 is True
        assert created2 is False
        assert job1.id == job2.id


def test_init_db_auto_falls_back_to_sqlite_when_postgres_unreachable(tmp_path: Path, monkeypatch):
    fallback_db = tmp_path / "gateway-fallback.db"

    monkeypatch.setenv("GATEWAY_ENV", "dev")
    monkeypatch.setenv("GATEWAY_DB_AUTO_FALLBACK", "1")
    monkeypatch.setenv("GATEWAY_SQLITE_FALLBACK_PATH", str(fallback_db))
    monkeypatch.setenv("GATEWAY_DB_CONNECT_TIMEOUT_SEC", "1")

    reconfigure_db("postgresql+psycopg://postgres:postgres@127.0.0.1:5432/anotherme2")

    def _fake_create_all(*args, **kwargs):
        bind = kwargs.get("bind")
        engine_url = ""
        if isinstance(bind, Connection):
            engine_url = str(bind.engine.url)
        elif bind is not None and hasattr(bind, "url"):
            engine_url = str(bind.url)

        if engine_url.startswith("postgresql"):
            raise OperationalError(
                "create_all",
                {},
                Exception("could not connect to server: Connection refused"),
            )
        return None

    with patch.object(db_module, "_postgres_tcp_reachable", return_value=True), patch.object(
        db_module.Base.metadata,
        "create_all",
        side_effect=_fake_create_all,
    ):
        init_db()

    engine_url = str(db_module.engine.url)
    assert engine_url.startswith("sqlite:///")
    assert fallback_db.as_posix() in engine_url


def test_init_db_precheck_fallback_initializes_sqlite_without_postgres_lock(tmp_path: Path, monkeypatch):
    fallback_db = tmp_path / "gateway-precheck-fallback.db"

    monkeypatch.setenv("GATEWAY_ENV", "dev")
    monkeypatch.setenv("GATEWAY_DB_AUTO_FALLBACK", "1")
    monkeypatch.setenv("GATEWAY_SQLITE_FALLBACK_PATH", str(fallback_db))

    reconfigure_db("postgresql+psycopg://postgres:postgres@127.0.0.1:5432/anotherme2")

    with patch.object(db_module, "_postgres_tcp_reachable", return_value=False):
        init_db()

    assert str(db_module.engine.url).startswith("sqlite:///")
    assert fallback_db.exists()


def test_api_contract_uploads_and_jobs(tmp_path: Path):
    db_path = tmp_path / "gateway.db"
    storage_root = tmp_path / "objects"

    settings = Settings(
        database_url=f"sqlite:///{db_path}",
        redis_url="redis://unused",
        local_storage_root=str(storage_root),
        worker_temp_root=str(tmp_path / "tmp"),
    )

    queue = FakeQueueClient()
    storage = LocalObjectStorage(storage_root)

    app = create_app(settings_override=settings, queue_client_override=queue, storage_override=storage)
    client = TestClient(app)

    up = client.post(
        "/v1/uploads",
        files={"file": ("problem.png", b"fakepng", "image/png")},
    )
    assert up.status_code == 200
    up_json = up.json()
    assert up_json["object_key"].startswith("uploads/")

    create = client.post(
        "/v1/jobs",
        json={
            "job_type": "problem_video_generate",
            "user_id": "u2",
            "payload": {"image_object_key": up_json["object_key"]},
        },
    )
    assert create.status_code == 200
    create_json = create.json()
    assert create_json["status"] == "queued"
    job_id = create_json["job_id"]

    query = client.get(f"/v1/jobs/{job_id}")
    assert query.status_code == 200
    assert query.json()["job_type"] == "problem_video_generate"

    result = client.get(f"/v1/jobs/{job_id}/result")
    assert result.status_code == 409


def test_study_package_requires_output():
    try:
        validate_job_payload(
            JobType.STUDY_PACKAGE_GENERATE,
            {"source": {"type": "topic", "topic": "相似三角形"}, "outputs": {"course": False, "problem_video": False}},
        )
    except Exception as exc:
        assert "cannot both be false" in str(exc)
    else:
        raise AssertionError("Expected validation failure")


def test_problem_video_result_contract(tmp_path: Path):
    db_path = tmp_path / "pv.db"
    obj_root = tmp_path / "objects"
    reconfigure_db(f"sqlite:///{db_path}")
    init_db()
    storage = LocalObjectStorage(obj_root)

    fake_video = tmp_path / "fake.mp4"
    fake_video.write_bytes(b"video")

    with session_scope() as session:
        job = Job(
            job_type="problem_video_generate",
            queue_name="q.problem_video",
            user_id="u1",
            idempotency_key="idem-problem-video-contract",
            status="running",
            progress=0,
            step="running",
            max_retries=0,
            input_payload={"image_object_key": "uploads/a.png"},
            normalized_payload={"image_object_key": "uploads/a.png", "output_profile": "1080p"},
            engine_state={},
        )
        session.add(job)
        session.flush()

        with patch(
            "api_gateway.job_service.run_problem_video_job",
            return_value=ProblemVideoExecutionResult(
                video_path=str(fake_video),
                duration_sec=12.5,
                script_steps_count=4,
                debug_bundle_path=None,
                requirement_hint="hint",
            ),
        ):
            result = _run_problem_video_generate(
                session=session,
                job=job,
                payload={"image_object_key": "uploads/a.png", "output_profile": "1080p"},
                settings=Settings(local_storage_root=str(obj_root)),
                storage=storage,
            )

        assert set(result.keys()) == {"video_url", "duration_sec", "script_steps_count", "debug_bundle_url"}


def test_problem_video_missing_input_is_failed_without_retry(tmp_path: Path):
    db_path = tmp_path / "missing-input.db"
    obj_root = tmp_path / "objects"
    reconfigure_db(f"sqlite:///{db_path}")
    init_db()

    queue = FakeQueueClient()
    settings = Settings(
        database_url=f"sqlite:///{db_path}",
        redis_url="redis://unused",
        local_storage_root=str(obj_root),
        max_retries=2,
    )
    storage = LocalObjectStorage(obj_root)

    with session_scope() as session:
        job = Job(
            job_type="problem_video_generate",
            queue_name="q.problem_video",
            user_id="u1",
            idempotency_key="idem-problem-video-missing-input",
            status="queued",
            progress=0,
            step="queued",
            max_retries=2,
            input_payload={"image_object_key": "uploads/missing.png"},
            normalized_payload={"image_object_key": "uploads/missing.png", "output_profile": "1080p"},
            engine_state={},
        )
        session.add(job)
        session.flush()
        message = QueueMessage(job_id=job.id, job_type=job.job_type, queue_name=job.queue_name)

        with patch("api_gateway.job_service.execute_job", side_effect=MissingInputObjectError("object not found")):
            handle_worker_message(
                session=session,
                queue_client=queue,
                message=message,
                settings=settings,
                storage=storage,
            )

        refreshed = session.get(Job, job.id)
        assert refreshed is not None
        assert refreshed.status == "failed"
        assert refreshed.error_code == "JOB_INPUT_MISSING"
        assert refreshed.attempt_count == 0
        assert queue.items == []
        assert queue.dead_letters == []


def test_fail_jobs_with_missing_input_objects_marks_queued_only(tmp_path: Path):
    db_path = tmp_path / "missing-input-cleanup.db"
    obj_root = tmp_path / "objects"
    reconfigure_db(f"sqlite:///{db_path}")
    init_db()

    storage = LocalObjectStorage(obj_root)

    with session_scope() as session:
        queued_job = Job(
            job_type="problem_video_generate",
            queue_name="q.problem_video",
            user_id="u1",
            idempotency_key="idem-missing-input-queued",
            status="queued",
            progress=0,
            step="queued",
            max_retries=2,
            input_payload={"image_object_key": "uploads/missing-queued.png"},
            normalized_payload={"image_object_key": "uploads/missing-queued.png", "output_profile": "1080p"},
            engine_state={},
        )
        running_job = Job(
            job_type="problem_video_generate",
            queue_name="q.problem_video",
            user_id="u2",
            idempotency_key="idem-missing-input-running",
            status="running",
            progress=35,
            step="running_anotherme2",
            max_retries=2,
            input_payload={"image_object_key": "uploads/missing-running.png"},
            normalized_payload={"image_object_key": "uploads/missing-running.png", "output_profile": "1080p"},
            engine_state={},
        )
        healthy_job = Job(
            job_type="problem_video_generate",
            queue_name="q.problem_video",
            user_id="u3",
            idempotency_key="idem-present-input",
            status="queued",
            progress=0,
            step="queued",
            max_retries=2,
            input_payload={"image_object_key": "uploads/present.png"},
            normalized_payload={"image_object_key": "uploads/present.png", "output_profile": "1080p"},
            engine_state={},
        )
        geometry_missing_job = Job(
            job_type="problem_video_generate",
            queue_name="q.problem_video",
            user_id="u4",
            idempotency_key="idem-missing-geometry",
            status="queued",
            progress=0,
            step="queued",
            max_retries=2,
            input_payload={"image_object_key": "uploads/present-geometry.png", "geometry_file": "uploads/missing-geo.json"},
            normalized_payload={
                "image_object_key": "uploads/present-geometry.png",
                "geometry_file": "uploads/missing-geo.json",
                "output_profile": "1080p",
            },
            engine_state={},
        )
        session.add_all([queued_job, running_job, healthy_job, geometry_missing_job])
        session.flush()

        (obj_root / "uploads").mkdir(parents=True, exist_ok=True)
        (obj_root / "uploads" / "present.png").write_bytes(b"ok")
        (obj_root / "uploads" / "present-geometry.png").write_bytes(b"ok")

        cleaned = fail_jobs_with_missing_input_objects(
            session,
            storage,
            ["q.problem_video"],
            max_failures=5,
        )

        assert cleaned == 2
        assert queued_job.status == "failed"
        assert geometry_missing_job.status == "failed"
        assert running_job.status == "running"
        assert queued_job.error_code == "JOB_INPUT_MISSING"
        assert geometry_missing_job.error_code == "JOB_INPUT_MISSING"
        assert running_job.error_code is None
        assert healthy_job.status == "queued"


def test_reconcile_running_job_with_uploaded_artifact_marks_succeeded(tmp_path: Path):
    db_path = tmp_path / "reconcile-running.db"
    reconfigure_db(f"sqlite:///{db_path}")
    init_db()

    with session_scope() as session:
        job = Job(
            job_type="problem_video_generate",
            queue_name="q.problem_video",
            user_id="u1",
            idempotency_key="idem-reconcile-running",
            status="running",
            progress=80,
            step="uploading_artifacts",
            max_retries=2,
            input_payload={"image_object_key": "uploads/present.png"},
            normalized_payload={"image_object_key": "uploads/present.png", "output_profile": "1080p"},
            engine_state={"duration_sec": 21.5, "script_steps_count": 5},
        )
        session.add(job)
        session.flush()

        session.add(
            JobArtifact(
                job_id=job.id,
                artifact_type="problem_video",
                object_key=f"jobs/{job.id}/problem_video/final.mp4",
                url=f"http://127.0.0.1:9000/jobs/{job.id}/problem_video/final.mp4",
                artifact_metadata=None,
            )
        )
        session.flush()

        changed = reconcile_single_running_problem_video_job_with_artifacts(session, job)
        assert changed is True
        assert job.status == "succeeded"
        assert job.step == "completed"
        assert job.result_payload is not None
        assert job.result_payload.get("video_url", "").endswith("/final.mp4")
        assert job.result_payload.get("duration_sec") == 21.5
        assert job.result_payload.get("script_steps_count") == 5


def test_purge_prestart_nonterminal_jobs_marks_queued_and_running_failed(tmp_path: Path):
    db_path = tmp_path / "purge-prestart.db"
    reconfigure_db(f"sqlite:///{db_path}")
    init_db()

    with session_scope() as session:
        queued_job = Job(
            job_type="problem_video_generate",
            queue_name="q.problem_video",
            user_id="u1",
            idempotency_key="idem-prestart-queued",
            status="queued",
            progress=0,
            step="queued",
            max_retries=2,
            input_payload={"image_object_key": "uploads/a.png"},
            normalized_payload={"image_object_key": "uploads/a.png", "output_profile": "1080p"},
            engine_state={},
        )
        running_job = Job(
            job_type="problem_video_generate",
            queue_name="q.problem_video",
            user_id="u2",
            idempotency_key="idem-prestart-running",
            status="running",
            progress=65,
            step="uploading_artifacts",
            max_retries=2,
            input_payload={"image_object_key": "uploads/b.png"},
            normalized_payload={"image_object_key": "uploads/b.png", "output_profile": "1080p"},
            engine_state={},
        )
        succeeded_job = Job(
            job_type="problem_video_generate",
            queue_name="q.problem_video",
            user_id="u3",
            idempotency_key="idem-prestart-succeeded",
            status="succeeded",
            progress=100,
            step="completed",
            max_retries=2,
            input_payload={"image_object_key": "uploads/c.png"},
            normalized_payload={"image_object_key": "uploads/c.png", "output_profile": "1080p"},
            engine_state={},
        )
        session.add_all([queued_job, running_job, succeeded_job])
        session.flush()

        purged = purge_prestart_nonterminal_jobs(session, max_purge=10)
        assert purged == 2
        assert queued_job.status == "failed"
        assert running_job.status == "failed"
        assert queued_job.error_code == "JOB_PURGED_ON_RESTART"
        assert running_job.error_code == "JOB_PURGED_ON_RESTART"
        assert succeeded_job.status == "succeeded"
