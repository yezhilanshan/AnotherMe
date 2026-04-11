"""Runtime settings for the API gateway."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("GATEWAY_APP_NAME", "anotherme2-gateway")
    app_env: str = os.getenv("GATEWAY_ENV", "dev")
    app_host: str = os.getenv("GATEWAY_HOST", "0.0.0.0")
    app_port: int = int(os.getenv("GATEWAY_PORT", "8080"))

    database_url: str = os.getenv("GATEWAY_DATABASE_URL", "sqlite:///./gateway.db")

    redis_url: str = os.getenv("GATEWAY_REDIS_URL", "redis://localhost:6379/0")
    queue_course: str = os.getenv("GATEWAY_QUEUE_COURSE", "q.course")
    queue_problem_video: str = os.getenv("GATEWAY_QUEUE_PROBLEM_VIDEO", "q.problem_video")
    queue_package: str = os.getenv("GATEWAY_QUEUE_PACKAGE", "q.package")
    queue_dead_letter_prefix: str = os.getenv("GATEWAY_DLQ_PREFIX", "q.dlq")
    max_retries: int = int(os.getenv("GATEWAY_MAX_RETRIES", "2"))
    retry_base_seconds: int = int(os.getenv("GATEWAY_RETRY_BASE_SECONDS", "5"))

    openmaic_base_url: str = os.getenv("OPENMAIC_BASE_URL", "http://localhost:3000")
    openmaic_poll_seconds: int = int(os.getenv("OPENMAIC_POLL_SECONDS", "5"))
    openmaic_timeout_seconds: int = int(os.getenv("OPENMAIC_TIMEOUT_SECONDS", "1200"))

    object_storage_driver: str = os.getenv("OBJECT_STORAGE_DRIVER", "local")
    object_storage_bucket: str = os.getenv("OBJECT_STORAGE_BUCKET", "anotherme2-artifacts")
    object_storage_endpoint: str = os.getenv("OBJECT_STORAGE_ENDPOINT_URL", "")
    object_storage_access_key: str = os.getenv("OBJECT_STORAGE_ACCESS_KEY", "")
    object_storage_secret_key: str = os.getenv("OBJECT_STORAGE_SECRET_KEY", "")
    object_storage_region: str = os.getenv("OBJECT_STORAGE_REGION", "us-east-1")
    object_storage_public_base_url: str = os.getenv("OBJECT_STORAGE_PUBLIC_BASE_URL", "")
    local_storage_root: str = os.getenv("LOCAL_STORAGE_ROOT", "./gateway_data/objects")

    worker_temp_root: str = os.getenv("GATEWAY_WORKER_TEMP_ROOT", "./gateway_data/tmp")

    # Optional static token for phase-1 single-tenant auth.
    api_token: str = os.getenv("GATEWAY_API_TOKEN", "")

    @property
    def queue_mapping(self) -> dict[str, str]:
        return {
            "course_generate": self.queue_course,
            "problem_video_generate": self.queue_problem_video,
            "study_package_generate": self.queue_package,
        }

    @property
    def dlq_mapping(self) -> dict[str, str]:
        return {
            queue: f"{self.queue_dead_letter_prefix}.{queue}"
            for queue in [self.queue_course, self.queue_problem_video, self.queue_package]
        }


_SETTINGS: Settings | None = None


def get_settings() -> Settings:
    global _SETTINGS
    if _SETTINGS is None:
        _SETTINGS = Settings()
    return _SETTINGS
