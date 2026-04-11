"""SQLAlchemy ORM models for unified job orchestration."""

from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from .db import Base


JsonType = JSONB().with_variant(JSON, "sqlite")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    job_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    queue_name: Mapped[str] = mapped_column(String(64), nullable=False)
    user_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    parent_job_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("jobs.id"), nullable=True)

    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)

    status: Mapped[str] = mapped_column(String(32), nullable=False, default="queued", index=True)
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    step: Mapped[str] = mapped_column(String(64), nullable=False, default="queued")

    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, nullable=False, default=2)

    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    input_payload: Mapped[dict] = mapped_column(JsonType, nullable=False)
    normalized_payload: Mapped[dict] = mapped_column(JsonType, nullable=False)
    engine_state: Mapped[dict | None] = mapped_column(JsonType, nullable=True)
    result_payload: Mapped[dict | None] = mapped_column(JsonType, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    events: Mapped[list["JobEvent"]] = relationship(back_populates="job", cascade="all, delete-orphan")
    artifacts: Mapped[list["JobArtifact"]] = relationship(back_populates="job", cascade="all, delete-orphan")


class JobEvent(Base):
    __tablename__ = "job_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("jobs.id"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[dict | None] = mapped_column(JsonType, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    job: Mapped[Job] = relationship(back_populates="events")


class JobArtifact(Base):
    __tablename__ = "job_artifacts"
    __table_args__ = (UniqueConstraint("job_id", "artifact_type", "object_key", name="uq_job_artifact"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("jobs.id"), nullable=False, index=True)
    artifact_type: Mapped[str] = mapped_column(String(64), nullable=False)
    object_key: Mapped[str] = mapped_column(String(512), nullable=False)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    metadata: Mapped[dict | None] = mapped_column(JsonType, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    job: Mapped[Job] = relationship(back_populates="artifacts")
