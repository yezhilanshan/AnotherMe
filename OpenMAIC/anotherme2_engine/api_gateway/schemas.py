"""Pydantic schemas and contract validation for gateway APIs."""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field, ValidationError


class JobType(str, Enum):
    COURSE_GENERATE = "course_generate"
    PROBLEM_VIDEO_GENERATE = "problem_video_generate"
    STUDY_PACKAGE_GENERATE = "study_package_generate"


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class CourseOptions(BaseModel):
    enable_web_search: bool = False
    enable_image_generation: bool = False
    enable_video_generation: bool = False
    enable_tts: bool = False
    agent_mode: Literal["default", "generate"] = "default"


class CourseGenerateInput(BaseModel):
    requirement: str = Field(..., min_length=1)
    language: str = "zh-CN"
    options: CourseOptions = Field(default_factory=CourseOptions)


class ProblemVideoGenerateInput(BaseModel):
    image_object_key: str = Field(..., min_length=1)
    problem_text: Optional[str] = None
    geometry_file: Optional[str] = None
    output_profile: str = "1080p"


class StudyPackageSource(BaseModel):
    type: Literal["topic", "photo"]
    topic: Optional[str] = None
    image_object_key: Optional[str] = None


class StudyPackageOutputs(BaseModel):
    course: bool = True
    problem_video: bool = True


class StudyPackageGenerateInput(BaseModel):
    source: StudyPackageSource
    outputs: StudyPackageOutputs = Field(default_factory=StudyPackageOutputs)


class CreateJobRequest(BaseModel):
    job_type: JobType
    payload: Dict[str, Any]
    user_id: str = "default_user"


class UploadResponse(BaseModel):
    object_key: str
    url: str
    size: int
    content_type: str


class JobSummary(BaseModel):
    job_id: str
    job_type: JobType
    status: JobStatus
    progress: int
    step: str
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    created_at: str
    updated_at: str


class JobResultResponse(BaseModel):
    job_id: str
    status: JobStatus
    result: Dict[str, Any]


class APIError(BaseModel):
    error_code: str
    message: str
    details: Optional[Dict[str, Any]] = None


def _model_dump(value: BaseModel) -> Dict[str, Any]:
    return value.model_dump() if hasattr(value, "model_dump") else value.dict()


def validate_job_payload(job_type: JobType, payload: Dict[str, Any]) -> Dict[str, Any]:
    model_map = {
        JobType.COURSE_GENERATE: CourseGenerateInput,
        JobType.PROBLEM_VIDEO_GENERATE: ProblemVideoGenerateInput,
        JobType.STUDY_PACKAGE_GENERATE: StudyPackageGenerateInput,
    }
    model = model_map[job_type]

    try:
        validated = model.model_validate(payload) if hasattr(model, "model_validate") else model.parse_obj(payload)
    except ValidationError:
        raise

    normalized = _model_dump(validated)

    if job_type == JobType.STUDY_PACKAGE_GENERATE:
        source = normalized["source"]
        outputs = normalized["outputs"]
        if source["type"] == "topic" and not (source.get("topic") or "").strip():
            raise ValueError("source.topic is required when source.type=topic")
        if source["type"] == "photo" and not (source.get("image_object_key") or "").strip():
            raise ValueError("source.image_object_key is required when source.type=photo")
        if not outputs.get("course") and not outputs.get("problem_video"):
            raise ValueError("outputs.course and outputs.problem_video cannot both be false")

    return normalized
