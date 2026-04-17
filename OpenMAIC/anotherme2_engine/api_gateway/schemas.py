"""Pydantic schemas and contract validation for gateway APIs."""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field, ValidationError


class JobType(str, Enum):
    COURSE_GENERATE = "course_generate"
    PROBLEM_VIDEO_GENERATE = "problem_video_generate"
    STUDY_PACKAGE_GENERATE = "study_package_generate"
    LEARNING_RECORD_EXTRACT = "learning_record_extract"


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


class LearningRecordExtractInput(BaseModel):
    session_id: str = Field(..., min_length=1)
    user_id: Optional[str] = None
    extract_version: str = "v1"


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


class MessageAttachmentInput(BaseModel):
    file_url: str = Field(..., min_length=1)
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    object_key: Optional[str] = None


class CreateConversationRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    type: str = "single"
    name: str = Field(..., min_length=1)
    creator_id: Optional[str] = None
    member_ids: list[str] = Field(default_factory=list)


class ConversationSummary(BaseModel):
    conversation_id: str
    type: str
    name: str
    creator_id: str
    last_message_id: Optional[str] = None
    last_message_time: Optional[str] = None
    unread_count: int = 0
    created_at: str
    updated_at: str


class ConversationMemberSummary(BaseModel):
    conversation_id: str
    user_id: str
    joined_at: str
    mute_flag: bool = False
    unread_count: int = 0
    last_read_message_id: Optional[str] = None
    last_read_seq: int = 0


class AddConversationMembersRequest(BaseModel):
    operator_user_id: str = Field(..., min_length=1)
    member_ids: list[str] = Field(..., min_length=1)


class RemoveConversationMemberRequest(BaseModel):
    operator_user_id: str = Field(..., min_length=1)


class RemoveConversationMemberResponse(BaseModel):
    conversation_id: str
    member_user_id: str
    removed: bool


class CreateMessageRequest(BaseModel):
    sender_id: str = Field(..., min_length=1)
    message_type: str = "text"
    content: str = Field(..., min_length=1)
    reply_to_message_id: Optional[str] = None
    status: str = "sent"
    source_type: str = "manual"
    source_ref_id: Optional[str] = None
    attachments: list[MessageAttachmentInput] = Field(default_factory=list)


class MessageAttachmentOutput(MessageAttachmentInput):
    attachment_id: str


class MessageOutput(BaseModel):
    message_id: str
    conversation_id: str
    seq: int
    sender_id: str
    message_type: str
    content: str
    reply_to_message_id: Optional[str] = None
    status: str
    source_type: str
    source_ref_id: Optional[str] = None
    recalled_flag: bool = False
    deleted_flag: bool = False
    created_at: str
    attachments: list[MessageAttachmentOutput] = Field(default_factory=list)


class MarkConversationReadRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    last_read_seq: Optional[int] = None


class ConversationReadResponse(BaseModel):
    conversation_id: str
    user_id: str
    last_read_seq: int
    unread_count: int


class CreateAIChatSessionRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    source: str = "课后答疑"
    subject: Optional[str] = None
    linked_classroom_id: Optional[str] = None
    linked_conversation_id: Optional[str] = None


class AIChatSessionSummary(BaseModel):
    session_id: str
    user_id: str
    title: str
    source: str
    subject: Optional[str] = None
    linked_classroom_id: Optional[str] = None
    linked_conversation_id: Optional[str] = None
    archived_flag: bool
    created_at: str
    updated_at: str


class CreateAIChatMessageRequest(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str = Field(..., min_length=1)
    user_id: Optional[str] = None
    content_type: str = "text"
    model_name: Optional[str] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    latency_ms: Optional[int] = None
    request_id: Optional[str] = None
    parent_message_id: Optional[str] = None


class AIChatMessageOutput(BaseModel):
    message_id: str
    session_id: str
    role: str
    content: str
    content_type: str
    model_name: Optional[str] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    latency_ms: Optional[int] = None
    request_id: Optional[str] = None
    parent_message_id: Optional[str] = None
    created_at: str


class AIMessageFeedbackRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    rating: Literal["like", "dislike"]
    feedback_text: Optional[str] = None


class AIMessageFeedbackOutput(BaseModel):
    feedback_id: str
    message_id: str
    user_id: str
    rating: str
    feedback_text: Optional[str] = None
    created_at: str


def _model_dump(value: BaseModel) -> Dict[str, Any]:
    return value.model_dump() if hasattr(value, "model_dump") else value.dict()


def validate_job_payload(job_type: JobType, payload: Dict[str, Any]) -> Dict[str, Any]:
    model_map = {
        JobType.COURSE_GENERATE: CourseGenerateInput,
        JobType.PROBLEM_VIDEO_GENERATE: ProblemVideoGenerateInput,
        JobType.STUDY_PACKAGE_GENERATE: StudyPackageGenerateInput,
        JobType.LEARNING_RECORD_EXTRACT: LearningRecordExtractInput,
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
