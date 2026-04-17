"""FastAPI app exposing unified backend job APIs."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import db as db_module
from .chat_service import (
    add_conversation_members,
    create_ai_message,
    create_ai_session,
    create_conversation,
    create_message,
    is_conversation_member,
    list_ai_messages,
    list_ai_sessions,
    list_conversation_members,
    list_conversations,
    list_messages,
    mark_conversation_read,
    remove_conversation_member,
    serialize_ai_feedback,
    serialize_ai_message,
    serialize_ai_session,
    serialize_conversation,
    serialize_message,
    upsert_ai_feedback,
)
from .config import Settings, get_settings
from .db import get_db, init_db, reconfigure_db
from .job_service import (
    create_or_get_job,
    purge_prestart_nonterminal_jobs,
    reconcile_single_running_problem_video_job_with_artifacts,
    serialize_job,
)
from .models import Conversation, Job
from .queueing import QueueMessage, build_queue_client
from .schemas import (
    AddConversationMembersRequest,
    AIChatMessageOutput,
    AIChatSessionSummary,
    AIMessageFeedbackOutput,
    AIMessageFeedbackRequest,
    ConversationMemberSummary,
    ConversationReadResponse,
    ConversationSummary,
    CreateAIChatMessageRequest,
    CreateAIChatSessionRequest,
    CreateConversationRequest,
    CreateJobRequest,
    CreateMessageRequest,
    JobResultResponse,
    JobStatus,
    JobSummary,
    MarkConversationReadRequest,
    MessageOutput,
    RemoveConversationMemberRequest,
    RemoveConversationMemberResponse,
    UploadResponse,
)
from .storage import ObjectStorage, build_storage, guess_content_type


class QueueClientProtocol:
    def enqueue(self, queue_name, message):
        raise NotImplementedError

    def ping(self):
        raise NotImplementedError


class ConversationSocketHub:
    def __init__(self):
        self._connections: dict[str, dict[str, set[WebSocket]]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, conversation_id: str, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            by_user = self._connections.setdefault(conversation_id, {})
            by_user.setdefault(user_id, set()).add(websocket)

    async def disconnect(self, conversation_id: str, user_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            by_user = self._connections.get(conversation_id)
            if not by_user:
                return

            targets = by_user.get(user_id)
            if not targets:
                return

            targets.discard(websocket)
            if not targets:
                by_user.pop(user_id, None)

            if not by_user:
                self._connections.pop(conversation_id, None)

    async def broadcast(self, conversation_id: str, payload: dict) -> None:
        async with self._lock:
            by_user = self._connections.get(conversation_id, {})
            sockets: list[tuple[str, WebSocket]] = []
            for user_id, targets in by_user.items():
                for socket in targets:
                    sockets.append((user_id, socket))
        if not sockets:
            return

        text = json.dumps(payload, ensure_ascii=False)
        dead: list[tuple[str, WebSocket]] = []
        for user_id, socket in sockets:
            try:
                await socket.send_text(text)
            except Exception:
                dead.append((user_id, socket))

        if dead:
            async with self._lock:
                by_user = self._connections.get(conversation_id)
                if not by_user:
                    return

                for user_id, socket in dead:
                    targets = by_user.get(user_id)
                    if not targets:
                        continue
                    targets.discard(socket)
                    if not targets:
                        by_user.pop(user_id, None)

                if not by_user:
                    self._connections.pop(conversation_id, None)

    async def disconnect_user(self, conversation_id: str, user_id: str, code: int = 4403) -> None:
        sockets: list[WebSocket] = []
        async with self._lock:
            by_user = self._connections.get(conversation_id)
            if not by_user:
                return

            sockets = list(by_user.pop(user_id, set()))
            if not by_user:
                self._connections.pop(conversation_id, None)

        for socket in sockets:
            try:
                await socket.close(code=code)
            except Exception:
                pass


class ConversationEventBus:
    _CHANNEL = "gateway:conversation_events"

    def __init__(self, redis_url: str, hub: ConversationSocketHub):
        self._redis_url = redis_url
        self._hub = hub
        self._instance_id = uuid4().hex
        self._enabled = False
        self._pub_client = None
        self._sub_client = None
        self._pubsub = None
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        if not self._redis_url or "unused" in self._redis_url:
            return
        try:
            import redis.asyncio as redis_async
        except Exception:
            return

        try:
            self._pub_client = redis_async.Redis.from_url(
                self._redis_url,
                decode_responses=True,
                socket_connect_timeout=1,
                socket_timeout=1,
            )
            await self._pub_client.ping()
            self._sub_client = redis_async.Redis.from_url(
                self._redis_url,
                decode_responses=True,
                socket_connect_timeout=1,
                socket_timeout=1,
            )
            self._pubsub = self._sub_client.pubsub()
            await self._pubsub.subscribe(self._CHANNEL)
            self._task = asyncio.create_task(self._listen(), name="conversation-event-bus")
            self._enabled = True
        except Exception:
            await self.stop()

    async def stop(self) -> None:
        task = self._task
        self._task = None
        if task:
            task.cancel()
            try:
                await task
            except Exception:
                pass

        if self._pubsub is not None:
            try:
                await self._pubsub.close()
            except Exception:
                pass
            self._pubsub = None

        if self._sub_client is not None:
            try:
                await self._sub_client.aclose()
            except Exception:
                pass
            self._sub_client = None

        if self._pub_client is not None:
            try:
                await self._pub_client.aclose()
            except Exception:
                pass
            self._pub_client = None

        self._enabled = False

    async def publish(self, conversation_id: str, payload: dict) -> None:
        await self._apply_event(conversation_id, payload)
        if not self._enabled or self._pub_client is None:
            return
        envelope = {
            "instance_id": self._instance_id,
            "conversation_id": conversation_id,
            "payload": payload,
        }
        try:
            await self._pub_client.publish(self._CHANNEL, json.dumps(envelope, ensure_ascii=False))
        except Exception:
            pass

    async def _listen(self) -> None:
        if self._pubsub is None:
            return
        while True:
            try:
                message = await self._pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            except asyncio.CancelledError:
                raise
            except Exception:
                await asyncio.sleep(0.2)
                continue

            if not message:
                await asyncio.sleep(0.05)
                continue

            raw = message.get("data")
            if not isinstance(raw, str):
                continue
            try:
                envelope = json.loads(raw)
            except json.JSONDecodeError:
                continue

            if envelope.get("instance_id") == self._instance_id:
                continue

            conversation_id = str(envelope.get("conversation_id") or "")
            payload = envelope.get("payload")
            if not conversation_id or not isinstance(payload, dict):
                continue
            await self._apply_event(conversation_id, payload)

    async def _apply_event(self, conversation_id: str, payload: dict) -> None:
        if payload.get("type") == "disconnect_user":
            user_id = str(payload.get("user_id") or "")
            if user_id:
                await self._hub.disconnect_user(conversation_id, user_id)
            return
        await self._hub.broadcast(conversation_id, payload)


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

    queue_client = queue_client_override or build_queue_client(settings)
    storage = storage_override or build_storage(settings)
    conversation_hub = ConversationSocketHub()
    event_bus = ConversationEventBus(settings.redis_url, conversation_hub)

    @app.on_event("startup")
    async def startup_event() -> None:
        Path(settings.worker_temp_root).mkdir(parents=True, exist_ok=True)
        reconfigure_db(settings.database_url)
        init_db()

        if settings.purge_prestart_jobs_on_startup:
            startup_db = db_module.SessionLocal()
            try:
                purged = purge_prestart_nonterminal_jobs(
                    startup_db,
                    max_purge=max(0, settings.purge_prestart_jobs_batch),
                )
                startup_db.commit()
                if purged:
                    print(f"[gateway-app] purged {purged} pre-restart queued/running job(s) on startup")
            except Exception:
                startup_db.rollback()
                raise
            finally:
                startup_db.close()

            if settings.purge_prestart_queue_messages_on_startup:
                purge_method = getattr(queue_client, "purge_queues", None)
                if callable(purge_method):
                    queue_targets = [
                        settings.queue_course,
                        settings.queue_problem_video,
                        settings.queue_package,
                        settings.queue_learning_record,
                    ]
                    purged_messages = int(purge_method(queue_targets) or 0)
                    if purged_messages:
                        print(f"[gateway-app] purged {purged_messages} queued message(s) on startup")
        await event_bus.start()

    @app.on_event("shutdown")
    async def shutdown_event() -> None:
        await event_bus.stop()

    @app.get("/")
    def root() -> dict:
        """Avoid 404 noise when browsers or probes hit the gateway base URL."""
        return {
            "service": settings.app_name,
            "ok": True,
            "health": "/healthz",
            "api": "/v1/jobs",
        }

    @app.get("/healthz")
    def healthz() -> dict:
        redis_ok = False
        try:
            redis_ok = bool(queue_client.ping())
        except Exception:
            redis_ok = False
        return {
            "ok": True,
            "redis": redis_ok,
            "queue_backend": getattr(queue_client, "backend", "redis" if redis_ok else "polling"),
            "env": settings.app_env,
        }

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
            job, created = create_or_get_job(db, request, settings)
            db.commit()
            db.refresh(job)
            if created:
                try:
                    queue_client.enqueue(
                        job.queue_name,
                        QueueMessage(job_id=job.id, job_type=job.job_type, queue_name=job.queue_name),
                    )
                except Exception as enqueue_exc:
                    print(f"[gateway-app] enqueue failed for job {job.id}: {enqueue_exc}", flush=True)
            return JobSummary(**serialize_job(job))
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail={"error_code": "JOB_CONFLICT", "message": "Concurrent duplicate job submission detected"},
            )
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
        if reconcile_single_running_problem_video_job_with_artifacts(db, job):
            db.commit()
            db.refresh(job)
        return JobSummary(**serialize_job(job))

    @app.get("/v1/jobs/{job_id}/result", response_model=JobResultResponse)
    def get_job_result(job_id: str, db: Session = Depends(get_db), authorization: str | None = Header(default=None)):
        _require_token(settings, authorization)
        job = db.get(Job, job_id)
        if not job:
            raise HTTPException(status_code=404, detail={"error_code": "JOB_NOT_FOUND", "message": "Job not found"})

        if job.status == JobStatus.RUNNING.value and reconcile_single_running_problem_video_job_with_artifacts(db, job):
            db.commit()
            db.refresh(job)

        if job.status != JobStatus.SUCCEEDED.value:
            raise HTTPException(
                status_code=409,
                detail={"error_code": "JOB_NOT_READY", "message": f"Job status={job.status}"},
            )

        return JobResultResponse(job_id=job.id, status=JobStatus(job.status), result=job.result_payload or {})

    @app.get("/v1/messages/conversations", response_model=list[ConversationSummary])
    def get_conversations(
        user_id: str = Query(..., min_length=1),
        limit: int = Query(50, ge=1, le=200),
        db: Session = Depends(get_db),
        authorization: str | None = Header(default=None),
    ):
        _require_token(settings, authorization)
        return [ConversationSummary(**row) for row in list_conversations(db, user_id=user_id, limit=limit)]

    @app.post("/v1/messages/conversations", response_model=ConversationSummary)
    def create_conversation_api(
        request: CreateConversationRequest,
        db: Session = Depends(get_db),
        authorization: str | None = Header(default=None),
    ):
        _require_token(settings, authorization)
        conversation = create_conversation(
            db,
            user_id=request.user_id,
            conversation_type=request.type,
            name=request.name,
            creator_id=request.creator_id,
            member_ids=request.member_ids,
        )
        db.commit()
        db.refresh(conversation)

        row = (
            db.query(Conversation)
            .filter(Conversation.id == conversation.id)
            .first()
        )
        return ConversationSummary(**serialize_conversation(row, unread_count=0))

    @app.get("/v1/messages/{conversation_id}/messages", response_model=list[MessageOutput])
    def get_messages(
        conversation_id: str,
        user_id: str = Query(..., min_length=1),
        limit: int = Query(100, ge=1, le=500),
        before_seq: int | None = Query(default=None),
        db: Session = Depends(get_db),
        authorization: str | None = Header(default=None),
    ):
        _require_token(settings, authorization)
        return [
            MessageOutput(**row)
            for row in list_messages(
                db,
                conversation_id,
                requester_user_id=user_id,
                limit=limit,
                before_seq=before_seq,
            )
        ]

    @app.post("/v1/messages/{conversation_id}/messages", response_model=MessageOutput)
    async def create_message_api(
        conversation_id: str,
        request: CreateMessageRequest,
        db: Session = Depends(get_db),
        authorization: str | None = Header(default=None),
    ):
        _require_token(settings, authorization)
        message, attachments = create_message(
            db,
            conversation_id=conversation_id,
            sender_id=request.sender_id,
            message_type=request.message_type,
            content=request.content,
            reply_to_message_id=request.reply_to_message_id,
            status=request.status,
            source_type=request.source_type,
            source_ref_id=request.source_ref_id,
            attachments=[
                item.model_dump() if hasattr(item, "model_dump") else item.dict()
                for item in request.attachments
            ],
        )
        db.commit()
        serialized = serialize_message(message, attachments)
        await event_bus.publish(
            conversation_id,
            {
                "type": "message_created",
                "conversation_id": conversation_id,
                "message": serialized,
            },
        )
        return MessageOutput(**serialized)

    @app.get("/v1/messages/{conversation_id}/members", response_model=list[ConversationMemberSummary])
    def get_conversation_members(
        conversation_id: str,
        user_id: str = Query(..., min_length=1),
        db: Session = Depends(get_db),
        authorization: str | None = Header(default=None),
    ):
        _require_token(settings, authorization)
        return [
            ConversationMemberSummary(**row)
            for row in list_conversation_members(db, conversation_id, requester_user_id=user_id)
        ]

    @app.post("/v1/messages/{conversation_id}/members", response_model=list[ConversationMemberSummary])
    async def add_conversation_members_api(
        conversation_id: str,
        request: AddConversationMembersRequest,
        db: Session = Depends(get_db),
        authorization: str | None = Header(default=None),
    ):
        _require_token(settings, authorization)
        rows = add_conversation_members(
            db,
            conversation_id=conversation_id,
            operator_user_id=request.operator_user_id,
            member_ids=request.member_ids,
        )
        db.commit()
        await event_bus.publish(
            conversation_id,
            {
                "type": "members_updated",
                "conversation_id": conversation_id,
                "members": rows,
            },
        )
        return [ConversationMemberSummary(**row) for row in rows]

    @app.delete("/v1/messages/{conversation_id}/members/{member_user_id}", response_model=RemoveConversationMemberResponse)
    async def remove_conversation_member_api(
        conversation_id: str,
        member_user_id: str,
        request: RemoveConversationMemberRequest,
        db: Session = Depends(get_db),
        authorization: str | None = Header(default=None),
    ):
        _require_token(settings, authorization)
        result = remove_conversation_member(
            db,
            conversation_id=conversation_id,
            operator_user_id=request.operator_user_id,
            member_user_id=member_user_id,
        )
        rows = list_conversation_members(db, conversation_id)
        db.commit()
        await event_bus.publish(
            conversation_id,
            {
                "type": "members_updated",
                "conversation_id": conversation_id,
                "members": rows,
            },
        )
        await event_bus.publish(
            conversation_id,
            {
                "type": "disconnect_user",
                "conversation_id": conversation_id,
                "user_id": member_user_id,
            },
        )
        return RemoveConversationMemberResponse(**result)

    @app.websocket("/ws/messages/{conversation_id}")
    async def conversation_ws(
        websocket: WebSocket,
        conversation_id: str,
        user_id: str = Query(..., min_length=1),
    ):
        session_factory = db_module.SessionLocal
        if session_factory is None:
            await websocket.close(code=1011)
            return

        check_session = session_factory()
        try:
            if not is_conversation_member(check_session, conversation_id, user_id):
                await websocket.close(code=4403)
                return
        finally:
            check_session.close()

        await conversation_hub.connect(conversation_id, user_id, websocket)
        try:
            await websocket.send_json(
                {
                    "type": "connected",
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                }
            )
            while True:
                content = await websocket.receive_text()
                if content.strip().lower() == "ping":
                    await websocket.send_json({"type": "pong", "conversation_id": conversation_id})
        except WebSocketDisconnect:
            pass
        finally:
            await conversation_hub.disconnect(conversation_id, user_id, websocket)

    @app.post("/v1/messages/{conversation_id}/read", response_model=ConversationReadResponse)
    def mark_read_api(
        conversation_id: str,
        request: MarkConversationReadRequest,
        db: Session = Depends(get_db),
        authorization: str | None = Header(default=None),
    ):
        _require_token(settings, authorization)
        result = mark_conversation_read(
            db,
            conversation_id=conversation_id,
            user_id=request.user_id,
            last_read_seq=request.last_read_seq,
        )
        db.commit()
        return ConversationReadResponse(**result)

    @app.get("/v1/ai/sessions", response_model=list[AIChatSessionSummary])
    def get_ai_sessions(
        user_id: str = Query(..., min_length=1),
        limit: int = Query(50, ge=1, le=200),
        linked_conversation_id: str | None = Query(default=None),
        db: Session = Depends(get_db),
        authorization: str | None = Header(default=None),
    ):
        _require_token(settings, authorization)
        rows = list_ai_sessions(
            db,
            user_id=user_id,
            limit=limit,
            linked_conversation_id=linked_conversation_id,
        )
        return [AIChatSessionSummary(**row) for row in rows]

    @app.post("/v1/ai/sessions", response_model=AIChatSessionSummary)
    def create_ai_session_api(
        request: CreateAIChatSessionRequest,
        db: Session = Depends(get_db),
        authorization: str | None = Header(default=None),
    ):
        _require_token(settings, authorization)
        row = create_ai_session(
            db,
            user_id=request.user_id,
            title=request.title,
            source=request.source,
            subject=request.subject,
            linked_classroom_id=request.linked_classroom_id,
            linked_conversation_id=request.linked_conversation_id,
        )
        db.commit()
        db.refresh(row)
        return AIChatSessionSummary(**serialize_ai_session(row))

    @app.get("/v1/ai/sessions/{session_id}/messages", response_model=list[AIChatMessageOutput])
    def get_ai_messages(
        session_id: str,
        limit: int = Query(200, ge=1, le=500),
        db: Session = Depends(get_db),
        authorization: str | None = Header(default=None),
    ):
        _require_token(settings, authorization)
        rows = list_ai_messages(db, session_id=session_id, limit=limit)
        return [AIChatMessageOutput(**row) for row in rows]

    @app.post("/v1/ai/sessions/{session_id}/messages", response_model=AIChatMessageOutput)
    def create_ai_message_api(
        session_id: str,
        request: CreateAIChatMessageRequest,
        db: Session = Depends(get_db),
        authorization: str | None = Header(default=None),
    ):
        _require_token(settings, authorization)
        row = create_ai_message(
            db,
            session_id=session_id,
            role=request.role,
            content=request.content,
            user_id=request.user_id,
            content_type=request.content_type,
            model_name=request.model_name,
            prompt_tokens=request.prompt_tokens,
            completion_tokens=request.completion_tokens,
            total_tokens=request.total_tokens,
            latency_ms=request.latency_ms,
            request_id=request.request_id,
            parent_message_id=request.parent_message_id,
        )
        db.commit()
        return AIChatMessageOutput(**serialize_ai_message(row))

    @app.post("/v1/ai/messages/{message_id}/feedback", response_model=AIMessageFeedbackOutput)
    def upsert_ai_feedback_api(
        message_id: str,
        request: AIMessageFeedbackRequest,
        db: Session = Depends(get_db),
        authorization: str | None = Header(default=None),
    ):
        _require_token(settings, authorization)
        row = upsert_ai_feedback(
            db,
            message_id=message_id,
            user_id=request.user_id,
            rating=request.rating,
            feedback_text=request.feedback_text,
        )
        db.commit()
        return AIMessageFeedbackOutput(**serialize_ai_feedback(row))

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_request, exc: HTTPException):
        if isinstance(exc.detail, dict):
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        return JSONResponse(status_code=exc.status_code, content={"error_code": "HTTP_ERROR", "message": str(exc.detail)})

    @app.exception_handler(ValueError)
    async def value_error_handler(_request, exc: ValueError):
        return JSONResponse(status_code=400, content={"error_code": "INVALID_REQUEST", "message": str(exc)})

    return app


app = create_app()
