"""Business logic for unified job lifecycle and execution."""

from __future__ import annotations

import hashlib
import json
import time
from datetime import datetime
from pathlib import Path
from tempfile import mkdtemp
from typing import Any, Dict
from uuid import uuid4

from sqlalchemy.orm import Session

from .anotherme_executor import (
    build_requirement_from_photo,
    extract_core_example_text,
    run_problem_video_job,
    synthesize_problem_image_from_text,
)
from .config import Settings
from .models import Job, JobArtifact, JobEvent
from .openmaic_client import OpenMAICClient, OpenMAICError
from .queueing import QueueMessage, RedisQueueClient
from .schemas import CreateJobRequest, JobStatus, JobType, validate_job_payload
from .storage import ObjectStorage


RUNNING_STATUSES = {JobStatus.QUEUED.value, JobStatus.RUNNING.value}


class JobServiceError(RuntimeError):
    pass


def _utcnow() -> datetime:
    return datetime.utcnow()


def canonical_json(data: Dict[str, Any]) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def compute_idempotency_key(job_type: str, normalized_payload: Dict[str, Any], user_id: str) -> str:
    raw = f"{job_type}|{canonical_json(normalized_payload)}|{user_id}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def add_event(session: Session, job_id: str, event_type: str, message: str, payload: Dict[str, Any] | None = None) -> None:
    session.add(
        JobEvent(
            job_id=job_id,
            event_type=event_type,
            message=message,
            payload=payload,
        )
    )


def add_artifact(
    session: Session,
    job_id: str,
    artifact_type: str,
    object_key: str,
    url: str,
    metadata: Dict[str, Any] | None = None,
) -> None:
    session.add(
        JobArtifact(
            job_id=job_id,
            artifact_type=artifact_type,
            object_key=object_key,
            url=url,
            metadata=metadata,
        )
    )


def serialize_job(job: Job) -> Dict[str, Any]:
    return {
        "job_id": job.id,
        "job_type": job.job_type,
        "status": job.status,
        "progress": job.progress,
        "step": job.step,
        "error_code": job.error_code,
        "error_message": job.error_message,
        "result": job.result_payload,
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat(),
    }


def create_or_get_job(
    session: Session,
    queue_client: RedisQueueClient,
    request: CreateJobRequest,
    settings: Settings,
) -> tuple[Job, bool]:
    normalized_payload = validate_job_payload(request.job_type, request.payload)
    idem_key = compute_idempotency_key(request.job_type.value, normalized_payload, request.user_id)

    existing = (
        session.query(Job)
        .filter(Job.idempotency_key == idem_key)
        .order_by(Job.created_at.desc())
        .first()
    )
    if existing and existing.status in RUNNING_STATUSES.union({JobStatus.SUCCEEDED.value}):
        return existing, False

    queue_name = settings.queue_mapping[request.job_type.value]
    job = Job(
        job_type=request.job_type.value,
        queue_name=queue_name,
        user_id=request.user_id,
        idempotency_key=idem_key,
        status=JobStatus.QUEUED.value,
        progress=0,
        step="queued",
        max_retries=settings.max_retries,
        input_payload=request.payload,
        normalized_payload=normalized_payload,
        engine_state={},
    )
    session.add(job)
    session.flush()

    add_event(session, job.id, "queued", "Job accepted and queued", {"queue": queue_name})
    queue_client.enqueue(queue_name, QueueMessage(job_id=job.id, job_type=job.job_type, queue_name=queue_name))
    return job, True


def _mark_running(session: Session, job: Job, step: str, message: str, progress: int) -> None:
    now = _utcnow()
    if not job.started_at:
        job.started_at = now
    job.updated_at = now
    job.status = JobStatus.RUNNING.value
    job.step = step
    job.progress = max(0, min(100, progress))
    add_event(session, job.id, "progress", message, {"step": step, "progress": job.progress})


def _mark_failed(session: Session, job: Job, error_code: str, message: str) -> None:
    job.status = JobStatus.FAILED.value
    job.error_code = error_code
    job.error_message = message
    job.step = "failed"
    job.completed_at = _utcnow()
    job.updated_at = _utcnow()
    add_event(session, job.id, "failed", message, {"error_code": error_code})


def _mark_succeeded(session: Session, job: Job, result_payload: Dict[str, Any]) -> None:
    job.status = JobStatus.SUCCEEDED.value
    job.progress = 100
    job.step = "completed"
    job.result_payload = result_payload
    job.completed_at = _utcnow()
    job.updated_at = _utcnow()
    add_event(session, job.id, "succeeded", "Job completed", {"result": result_payload})


def _run_course_generate(
    session: Session,
    job: Job,
    payload: Dict[str, Any],
    settings: Settings,
) -> Dict[str, Any]:
    client = OpenMAICClient(settings.openmaic_base_url)

    _mark_running(session, job, "submitting_openmaic", "Submitting course generation to OpenMAIC", 5)
    session.flush()

    submitted = client.submit_course_job(payload)
    openmaic_job_id = submitted.get("jobId") or submitted.get("job_id")
    if not openmaic_job_id:
        raise OpenMAICError(f"OpenMAIC submit response missing jobId: {submitted}")

    job.engine_state = {**(job.engine_state or {}), "openmaic_job_id": openmaic_job_id}
    add_event(session, job.id, "engine_state", "OpenMAIC job submitted", {"openmaic_job_id": openmaic_job_id})
    session.flush()

    start = time.time()
    while True:
        poll = client.poll_course_job(openmaic_job_id)
        status = str(poll.get("status") or "").lower()
        progress = int(poll.get("progress") or 0)
        step = str(poll.get("step") or "polling")
        message = str(poll.get("message") or "Polling OpenMAIC job")

        _mark_running(session, job, step, message, progress)
        session.flush()

        done = bool(poll.get("done")) or status in {"succeeded", "failed"}
        if done:
            if status == "succeeded":
                result = poll.get("result") or {}
                classroom_id = result.get("classroomId") or result.get("classroom_id")
                classroom_url = result.get("url") or result.get("classroom_url")
                scenes_count = int(result.get("scenesCount") or result.get("scenes_count") or 0)
                return {
                    "classroom_id": classroom_id,
                    "classroom_url": classroom_url,
                    "scenes_count": scenes_count,
                }
            raise OpenMAICError(poll.get("error") or "OpenMAIC job failed")

        if (time.time() - start) > settings.openmaic_timeout_seconds:
            raise OpenMAICError(f"OpenMAIC polling timeout ({settings.openmaic_timeout_seconds}s)")

        time.sleep(max(settings.openmaic_poll_seconds, 1))


def _run_problem_video_generate(
    session: Session,
    job: Job,
    payload: Dict[str, Any],
    settings: Settings,
    storage: ObjectStorage,
) -> Dict[str, Any]:
    _mark_running(session, job, "running_anotherme2", "Running AnotherMe2 video pipeline", 10)
    session.flush()

    exec_result = run_problem_video_job(payload, storage=storage, temp_root=settings.worker_temp_root)

    _mark_running(session, job, "uploading_artifacts", "Uploading generated artifacts", 80)
    session.flush()

    video_ext = Path(exec_result.video_path).suffix or ".mp4"
    video_key = f"jobs/{job.id}/problem_video/final{video_ext}"
    video_url = storage.upload_file(exec_result.video_path, video_key)
    add_artifact(session, job.id, "problem_video", video_key, video_url)

    debug_url = None
    if exec_result.debug_bundle_path and Path(exec_result.debug_bundle_path).exists():
        debug_key = f"jobs/{job.id}/problem_video/debug_bundle.zip"
        debug_url = storage.upload_file(exec_result.debug_bundle_path, debug_key, content_type="application/zip")
        add_artifact(session, job.id, "debug_bundle", debug_key, debug_url)

    job.engine_state = {**(job.engine_state or {}), "requirement_hint": exec_result.requirement_hint}

    return {
        "video_url": video_url,
        "duration_sec": exec_result.duration_sec,
        "script_steps_count": exec_result.script_steps_count,
        "debug_bundle_url": debug_url,
    }


def _create_inline_child_job(
    session: Session,
    parent: Job,
    child_type: str,
    payload: Dict[str, Any],
    settings: Settings,
) -> Job:
    child = Job(
        job_type=child_type,
        queue_name="inline",
        user_id=parent.user_id,
        parent_job_id=parent.id,
        idempotency_key=f"inline-{parent.id}-{child_type}-{uuid4().hex}",
        status=JobStatus.RUNNING.value,
        progress=0,
        step="inline_started",
        max_retries=0,
        input_payload=payload,
        normalized_payload=payload,
        engine_state={},
    )
    session.add(child)
    session.flush()
    add_event(session, child.id, "queued", "Inline child task created", {"parent": parent.id})
    return child


def _run_study_package(
    session: Session,
    job: Job,
    payload: Dict[str, Any],
    settings: Settings,
    storage: ObjectStorage,
) -> Dict[str, Any]:
    source = payload["source"]
    outputs = payload["outputs"]
    package_id = f"pkg_{job.id}"

    _mark_running(session, job, "package_started", "Running study package orchestration", 5)
    session.flush()

    course_result: Dict[str, Any] | None = None
    problem_result: Dict[str, Any] | None = None
    enabled_tasks = []
    if outputs.get("course", False):
        enabled_tasks.append("course")
    if outputs.get("problem_video", False):
        enabled_tasks.append("problem_video")
    if not enabled_tasks:
        raise JobServiceError("study_package_generate requires at least one output")

    if len(enabled_tasks) == 2:
        task_weights = {"course": 50.0, "problem_video": 50.0}
    else:
        only = enabled_tasks[0]
        task_weights = {only: 100.0}

    completed_weight = 0.0

    def _mark_parent_task_done(task: str, step: str, message: str) -> None:
        nonlocal completed_weight
        completed_weight += task_weights.get(task, 0.0)
        _mark_running(session, job, step, message, min(99, int(round(completed_weight))))
        session.flush()

    if source["type"] == "topic":
        topic = source["topic"]

        if outputs.get("course", False):
            child = _create_inline_child_job(
                session,
                job,
                JobType.COURSE_GENERATE.value,
                {
                    "requirement": topic,
                    "language": "zh-CN",
                    "options": {
                        "enable_web_search": True,
                        "enable_image_generation": False,
                        "enable_video_generation": False,
                        "enable_tts": True,
                        "agent_mode": "default",
                    },
                },
                settings,
            )
            course_result = _run_course_generate(session, child, child.input_payload, settings)
            _mark_succeeded(session, child, course_result)
            session.flush()
            _mark_parent_task_done("course", "topic_course_done", "Topic course generated")

        if outputs.get("problem_video", False):
            core_text = topic
            if course_result and course_result.get("classroom_id"):
                classroom_payload = OpenMAICClient(settings.openmaic_base_url).get_classroom(course_result["classroom_id"])
                core_text = extract_core_example_text(classroom_payload)

            synthetic_key = f"jobs/{job.id}/synthetic/topic_problem.png"
            synthesize_problem_image_from_text(core_text, storage, synthetic_key, settings.worker_temp_root)
            child = _create_inline_child_job(
                session,
                job,
                JobType.PROBLEM_VIDEO_GENERATE.value,
                {
                    "image_object_key": synthetic_key,
                    "problem_text": core_text,
                    "geometry_file": None,
                    "output_profile": "1080p",
                },
                settings,
            )
            problem_result = _run_problem_video_generate(session, child, child.input_payload, settings, storage)
            _mark_succeeded(session, child, problem_result)
            session.flush()
            _mark_parent_task_done("problem_video", "topic_problem_video_done", "Topic problem video generated")
    else:
        image_object_key = source["image_object_key"]
        requirement_hint: str | None = None

        if outputs.get("problem_video", False):
            child = _create_inline_child_job(
                session,
                job,
                JobType.PROBLEM_VIDEO_GENERATE.value,
                {
                    "image_object_key": image_object_key,
                    "problem_text": None,
                    "geometry_file": None,
                    "output_profile": "1080p",
                },
                settings,
            )
            problem_result = _run_problem_video_generate(session, child, child.input_payload, settings, storage)
            _mark_succeeded(session, child, problem_result)
            session.flush()
            requirement_hint = (child.engine_state or {}).get("requirement_hint")
            _mark_parent_task_done("problem_video", "photo_problem_video_done", "Photo problem video generated")

        if outputs.get("course", False):
            if not requirement_hint:
                try:
                    tmp_dir = Path(mkdtemp(prefix="photo-requirement-", dir=settings.worker_temp_root))
                    local_image = tmp_dir / "source_photo.png"
                    storage.download_file(image_object_key, str(local_image))
                    requirement_hint = build_requirement_from_photo(str(local_image))
                except Exception:
                    requirement_hint = "请围绕学生上传的拍题内容，生成系统化课程讲解，包含概念梳理、解题步骤和易错点。"

            child = _create_inline_child_job(
                session,
                job,
                JobType.COURSE_GENERATE.value,
                {
                    "requirement": requirement_hint,
                    "language": "zh-CN",
                    "options": {
                        "enable_web_search": True,
                        "enable_image_generation": False,
                        "enable_video_generation": False,
                        "enable_tts": True,
                        "agent_mode": "default",
                    },
                },
                settings,
            )
            course_result = _run_course_generate(session, child, child.input_payload, settings)
            _mark_succeeded(session, child, course_result)
            session.flush()
            _mark_parent_task_done("course", "photo_course_done", "Photo-derived course generated")

    result = {"package_id": package_id}
    if course_result is not None:
        result["course_result"] = course_result
    if problem_result is not None:
        result["problem_video_result"] = problem_result
    return result


def execute_job(session: Session, job: Job, settings: Settings, storage: ObjectStorage) -> Dict[str, Any]:
    payload = job.normalized_payload

    if job.job_type == JobType.COURSE_GENERATE.value:
        return _run_course_generate(session, job, payload, settings)
    if job.job_type == JobType.PROBLEM_VIDEO_GENERATE.value:
        return _run_problem_video_generate(session, job, payload, settings, storage)
    if job.job_type == JobType.STUDY_PACKAGE_GENERATE.value:
        return _run_study_package(session, job, payload, settings, storage)

    raise JobServiceError(f"Unsupported job type: {job.job_type}")


def handle_worker_message(
    session: Session,
    queue_client: RedisQueueClient,
    message: QueueMessage,
    settings: Settings,
    storage: ObjectStorage,
) -> None:
    job = session.get(Job, message.job_id)
    if not job:
        return
    if job.status == JobStatus.SUCCEEDED.value:
        return

    try:
        result = execute_job(session, job, settings, storage)
        _mark_succeeded(session, job, result)
    except Exception as exc:
        job.attempt_count += 1
        error_message = str(exc)
        if job.attempt_count <= job.max_retries:
            job.status = JobStatus.QUEUED.value
            job.step = "retrying"
            job.error_code = "RETRYING"
            job.error_message = error_message
            job.updated_at = _utcnow()
            delay = settings.retry_base_seconds * (2 ** (job.attempt_count - 1))
            add_event(
                session,
                job.id,
                "retry",
                f"Job failed; retrying in {delay}s",
                {"attempt": job.attempt_count, "error": error_message},
            )
            session.flush()
            time.sleep(delay)
            queue_client.enqueue(job.queue_name, QueueMessage(job_id=job.id, job_type=job.job_type, queue_name=job.queue_name))
        else:
            _mark_failed(session, job, "JOB_EXECUTION_FAILED", error_message)
            dlq_name = settings.dlq_mapping.get(job.queue_name, f"{settings.queue_dead_letter_prefix}.{job.queue_name}")
            queue_client.push_dead_letter(dlq_name, message)
