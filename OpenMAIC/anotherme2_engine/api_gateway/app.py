"""FastAPI app exposing unified backend job APIs."""

from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from .config import Settings, get_settings
from .db import get_db, init_db, reconfigure_db
from .job_service import create_or_get_job, serialize_job
from .models import Job
from .queueing import RedisQueueClient
from .schemas import CreateJobRequest, JobResultResponse, JobStatus, JobSummary, UploadResponse
from .storage import ObjectStorage, build_storage, guess_content_type


class QueueClientProtocol:
    def enqueue(self, queue_name, message):
        raise NotImplementedError

    def ping(self):
        raise NotImplementedError


def _require_token(settings: Settings, auth_header: str | None) -> None:
    if not settings.api_token:
        return
    expected = f"Bearer {settings.api_token}"
    if auth_header != expected:
        raise HTTPException(status_code=401, detail={"error_code": "UNAUTHORIZED", "message": "Invalid token"})


def create_app(
    settings_override: Settings | None = None,
    queue_client_override: QueueClientProtocol | None = None,
    storage_override: ObjectStorage | None = None,
) -> FastAPI:
    settings = settings_override or get_settings()
    app = FastAPI(title=settings.app_name)

    queue_client = queue_client_override or RedisQueueClient(settings.redis_url)
    storage = storage_override or build_storage(settings)

    @app.on_event("startup")
    def startup_event() -> None:
        Path(settings.worker_temp_root).mkdir(parents=True, exist_ok=True)
        reconfigure_db(settings.database_url)
        init_db()

    @app.get("/healthz")
    def healthz() -> dict:
        redis_ok = False
        try:
            redis_ok = bool(queue_client.ping())
        except Exception:
            redis_ok = False
        return {"ok": True, "redis": redis_ok, "env": settings.app_env}

    @app.post("/v1/uploads", response_model=UploadResponse)
    async def upload_problem_image(
        file: UploadFile = File(...),
        authorization: str | None = Header(default=None),
    ):
        _require_token(settings, authorization)

        if not file.filename:
            raise HTTPException(status_code=400, detail={"error_code": "INVALID_FILE", "message": "Missing filename"})

        object_key = f"uploads/{uuid4().hex}_{file.filename}"
        content_type = file.content_type or guess_content_type(file.filename)
        url = storage.upload_stream(file.file, object_key, content_type=content_type)

        # Try to infer size by reading uploaded stream length from file descriptor.
        size = 0
        try:
            current = file.file.tell()
            file.file.seek(0, 2)
            size = file.file.tell()
            file.file.seek(current)
        except Exception:
            size = 0

        return UploadResponse(object_key=object_key, url=url, size=size, content_type=content_type)

    @app.post("/v1/jobs", response_model=JobSummary)
    def create_job(
        request: CreateJobRequest,
        db: Session = Depends(get_db),
        authorization: str | None = Header(default=None),
    ):
        _require_token(settings, authorization)
        try:
            job, _created = create_or_get_job(db, queue_client, request, settings)
            db.commit()
            db.refresh(job)
            return JobSummary(**serialize_job(job))
        except Exception as exc:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail={"error_code": "INVALID_JOB_PAYLOAD", "message": str(exc)},
            )

    @app.get("/v1/jobs/{job_id}", response_model=JobSummary)
    def get_job(job_id: str, db: Session = Depends(get_db), authorization: str | None = Header(default=None)):
        _require_token(settings, authorization)
        job = db.get(Job, job_id)
        if not job:
            raise HTTPException(status_code=404, detail={"error_code": "JOB_NOT_FOUND", "message": "Job not found"})
        return JobSummary(**serialize_job(job))

    @app.get("/v1/jobs/{job_id}/result", response_model=JobResultResponse)
    def get_job_result(job_id: str, db: Session = Depends(get_db), authorization: str | None = Header(default=None)):
        _require_token(settings, authorization)
        job = db.get(Job, job_id)
        if not job:
            raise HTTPException(status_code=404, detail={"error_code": "JOB_NOT_FOUND", "message": "Job not found"})

        if job.status != JobStatus.SUCCEEDED.value:
            raise HTTPException(
                status_code=409,
                detail={"error_code": "JOB_NOT_READY", "message": f"Job status={job.status}"},
            )

        return JobResultResponse(job_id=job.id, status=JobStatus(job.status), result=job.result_payload or {})

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_request, exc: HTTPException):
        if isinstance(exc.detail, dict):
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        return JSONResponse(status_code=exc.status_code, content={"error_code": "HTTP_ERROR", "message": str(exc.detail)})

    return app


app = create_app()
