from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient
from unittest.mock import patch

from api_gateway.app import create_app
from api_gateway.config import Settings
from api_gateway.db import init_db, reconfigure_db, session_scope
from api_gateway.job_service import create_or_get_job, _run_problem_video_generate
from api_gateway.models import Job
from api_gateway.schemas import CreateJobRequest, JobType, validate_job_payload
from api_gateway.storage import LocalObjectStorage
from api_gateway.anotherme_executor import ProblemVideoExecutionResult


class FakeQueueClient:
    def __init__(self):
        self.items = []

    def enqueue(self, queue_name, message):
        self.items.append((queue_name, message))

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

    queue = FakeQueueClient()
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
        job1, created1 = create_or_get_job(session, queue, req, settings)
        session.flush()
        job2, created2 = create_or_get_job(session, queue, req, settings)
        session.flush()

        assert created1 is True
        assert created2 is False
        assert job1.id == job2.id

    assert len(queue.items) == 1


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
