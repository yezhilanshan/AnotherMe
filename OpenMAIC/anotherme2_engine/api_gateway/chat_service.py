"""Chat/message domain services for gateway APIs."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .models import (
    AIChatMessage,
    AIChatSession,
    AILearningRecord,
    AIMessageFeedback,
    AppUser,
    Conversation,
    ConversationMember,
    EventLog,
    Message,
    MessageAttachment,
    StudentProfile,
)


def _utcnow() -> datetime:
    return datetime.utcnow()


def _supports_for_update(session: Session) -> bool:
    bind = session.get_bind()
    if bind is None:
        return False
    return bind.dialect.name not in {"sqlite"}


def _ensure_user(session: Session, user_id: str, name: str | None = None) -> AppUser:
    user = session.get(AppUser, user_id)
    if user:
        if name and not user.name:
            user.name = name
        return user

    user = AppUser(id=user_id, name=name)
    session.add(user)
    session.flush()
    return user


def serialize_conversation(conversation: Conversation, unread_count: int = 0) -> dict[str, Any]:
    return {
        "conversation_id": conversation.id,
        "type": conversation.conversation_type,
        "name": conversation.name,
        "creator_id": conversation.creator_id,
        "last_message_id": conversation.last_message_id,
        "last_message_time": conversation.last_message_time.isoformat() if conversation.last_message_time else None,
        "unread_count": unread_count,
        "created_at": conversation.created_at.isoformat(),
        "updated_at": conversation.updated_at.isoformat(),
    }


def create_conversation(
    session: Session,
    user_id: str,
    conversation_type: str,
    name: str,
    creator_id: str | None = None,
    member_ids: list[str] | None = None,
) -> Conversation:
    creator = creator_id or user_id
    _ensure_user(session, creator)

    conversation = Conversation(
        conversation_type=conversation_type,
        name=name,
        creator_id=creator,
    )
    session.add(conversation)
    session.flush()

    members = set(member_ids or [])
    members.add(user_id)
    members.add(creator)

    for member_id in members:
        _ensure_user(session, member_id)
        session.add(
            ConversationMember(
                conversation_id=conversation.id,
                user_id=member_id,
                unread_count=0,
                last_read_seq=0,
            )
        )

    session.add(
        EventLog(
            user_id=user_id,
            event_type="conversation_created",
            target_id=conversation.id,
            extra_json={"type": conversation_type, "member_count": len(members)},
        )
    )

    return conversation


def list_conversations(session: Session, user_id: str, limit: int = 50) -> list[dict[str, Any]]:
    rows = (
        session.query(Conversation, ConversationMember)
        .join(ConversationMember, Conversation.id == ConversationMember.conversation_id)
        .filter(ConversationMember.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
        .limit(max(1, min(limit, 200)))
        .all()
    )

    return [serialize_conversation(conv, member.unread_count) for conv, member in rows]


def serialize_conversation_member(member: ConversationMember) -> dict[str, Any]:
    return {
        "conversation_id": member.conversation_id,
        "user_id": member.user_id,
        "joined_at": member.joined_at.isoformat(),
        "mute_flag": member.mute_flag,
        "unread_count": member.unread_count,
        "last_read_message_id": member.last_read_message_id,
        "last_read_seq": member.last_read_seq,
    }


def is_conversation_member(session: Session, conversation_id: str, user_id: str) -> bool:
    member = (
        session.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id,
        )
        .first()
    )
    return member is not None


def list_conversation_members(
    session: Session,
    conversation_id: str,
    requester_user_id: str | None = None,
) -> list[dict[str, Any]]:
    if requester_user_id and not is_conversation_member(session, conversation_id, requester_user_id):
        raise ValueError("Conversation member not found")

    members = (
        session.query(ConversationMember)
        .filter(ConversationMember.conversation_id == conversation_id)
        .order_by(ConversationMember.joined_at.asc())
        .all()
    )
    return [serialize_conversation_member(member) for member in members]


def add_conversation_members(
    session: Session,
    conversation_id: str,
    operator_user_id: str,
    member_ids: list[str],
) -> list[dict[str, Any]]:
    conversation = session.get(Conversation, conversation_id)
    if not conversation:
        raise ValueError("Conversation not found")

    if not is_conversation_member(session, conversation_id, operator_user_id):
        raise ValueError("Operator is not a conversation member")

    existing_members = {
        item.user_id
        for item in session.query(ConversationMember)
        .filter(ConversationMember.conversation_id == conversation_id)
        .all()
    }

    added_members: list[str] = []
    for member_id in member_ids:
        normalized = (member_id or "").strip()
        if not normalized or normalized in existing_members:
            continue

        _ensure_user(session, normalized)
        member = ConversationMember(
            conversation_id=conversation_id,
            user_id=normalized,
            unread_count=0,
            last_read_seq=0,
        )
        session.add(member)
        existing_members.add(normalized)
        added_members.append(normalized)

    if added_members:
        session.add(
            EventLog(
                user_id=operator_user_id,
                event_type="conversation_members_added",
                target_id=conversation_id,
                extra_json={"member_ids": added_members},
            )
        )

    session.flush()
    return list_conversation_members(session, conversation_id)


def remove_conversation_member(
    session: Session,
    conversation_id: str,
    operator_user_id: str,
    member_user_id: str,
) -> dict[str, Any]:
    conversation = session.get(Conversation, conversation_id)
    if not conversation:
        raise ValueError("Conversation not found")

    if not is_conversation_member(session, conversation_id, operator_user_id):
        raise ValueError("Operator is not a conversation member")

    if member_user_id == conversation.creator_id:
        raise ValueError("Cannot remove conversation creator")

    member = (
        session.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == member_user_id,
        )
        .first()
    )
    if not member:
        raise ValueError("Conversation member not found")

    session.delete(member)
    session.add(
        EventLog(
            user_id=operator_user_id,
            event_type="conversation_member_removed",
            target_id=conversation_id,
            extra_json={"member_user_id": member_user_id},
        )
    )
    session.flush()

    return {
        "conversation_id": conversation_id,
        "member_user_id": member_user_id,
        "removed": True,
    }


def _serialize_attachment(attachment: MessageAttachment) -> dict[str, Any]:
    return {
        "attachment_id": attachment.id,
        "file_url": attachment.file_url,
        "file_name": attachment.file_name,
        "file_size": attachment.file_size,
        "mime_type": attachment.mime_type,
        "object_key": attachment.object_key,
    }


def serialize_message(message: Message, attachments: list[MessageAttachment] | None = None) -> dict[str, Any]:
    return {
        "message_id": message.id,
        "conversation_id": message.conversation_id,
        "seq": message.seq,
        "sender_id": message.sender_id,
        "message_type": message.message_type,
        "content": message.content,
        "reply_to_message_id": message.reply_to_message_id,
        "status": message.status,
        "source_type": message.source_type,
        "source_ref_id": message.source_ref_id,
        "recalled_flag": message.recalled_flag,
        "deleted_flag": message.deleted_flag,
        "created_at": message.created_at.isoformat(),
        "attachments": [_serialize_attachment(item) for item in (attachments or [])],
    }


def list_messages(
    session: Session,
    conversation_id: str,
    requester_user_id: str | None = None,
    limit: int = 100,
    before_seq: int | None = None,
) -> list[dict[str, Any]]:
    if requester_user_id and not is_conversation_member(session, conversation_id, requester_user_id):
        raise ValueError("Conversation member not found")

    query = session.query(Message).filter(Message.conversation_id == conversation_id)
    if before_seq is not None:
        query = query.filter(Message.seq < before_seq)

    rows = query.order_by(Message.seq.desc()).limit(max(1, min(limit, 500))).all()
    rows = list(reversed(rows))

    if not rows:
        return []

    message_ids = [row.id for row in rows]
    attachments_by_message: dict[str, list[MessageAttachment]] = {mid: [] for mid in message_ids}
    attachments = (
        session.query(MessageAttachment)
        .filter(MessageAttachment.message_id.in_(message_ids))
        .order_by(MessageAttachment.created_at.asc())
        .all()
    )
    for attachment in attachments:
        attachments_by_message.setdefault(attachment.message_id, []).append(attachment)

    return [serialize_message(row, attachments_by_message.get(row.id) or []) for row in rows]


def create_message(
    session: Session,
    conversation_id: str,
    sender_id: str,
    message_type: str,
    content: str,
    reply_to_message_id: str | None = None,
    status: str = "sent",
    source_type: str = "manual",
    source_ref_id: str | None = None,
    attachments: list[dict[str, Any]] | None = None,
) -> tuple[Message, list[MessageAttachment]]:
    _ensure_user(session, sender_id)
    for attempt in range(3):
        try:
            with session.begin_nested():
                conversation_query = session.query(Conversation).filter(Conversation.id == conversation_id)
                if _supports_for_update(session):
                    conversation_query = conversation_query.with_for_update()
                conversation = conversation_query.first()
                if not conversation:
                    raise ValueError("Conversation not found")

                members_query = session.query(ConversationMember).filter(
                    ConversationMember.conversation_id == conversation_id
                )
                if _supports_for_update(session):
                    members_query = members_query.with_for_update()
                members = members_query.all()

                sender_member = next((item for item in members if item.user_id == sender_id), None)
                if sender_member is None:
                    raise ValueError("Sender is not a conversation member")

                max_seq = (
                    session.query(func.max(Message.seq))
                    .filter(Message.conversation_id == conversation_id)
                    .scalar()
                    or 0
                )
                next_seq = int(max_seq) + 1

                message = Message(
                    conversation_id=conversation_id,
                    seq=next_seq,
                    sender_id=sender_id,
                    message_type=message_type,
                    content=content,
                    reply_to_message_id=reply_to_message_id,
                    status=status,
                    source_type=source_type,
                    source_ref_id=source_ref_id,
                )
                session.add(message)
                session.flush()

                saved_attachments: list[MessageAttachment] = []
                for item in attachments or []:
                    attachment = MessageAttachment(
                        message_id=message.id,
                        file_url=str(item.get("file_url") or ""),
                        file_name=item.get("file_name"),
                        file_size=item.get("file_size"),
                        mime_type=item.get("mime_type"),
                        object_key=item.get("object_key"),
                    )
                    session.add(attachment)
                    saved_attachments.append(attachment)

                conversation.last_message_id = message.id
                conversation.last_message_time = message.created_at
                conversation.updated_at = _utcnow()

                for member in members:
                    if member.user_id == sender_id:
                        member.unread_count = 0
                        member.last_read_seq = max(member.last_read_seq, next_seq)
                        member.last_read_message_id = message.id
                    else:
                        member.unread_count += 1

                session.add(
                    EventLog(
                        user_id=sender_id,
                        event_type="message_sent",
                        target_id=conversation_id,
                        extra_json={
                            "message_id": message.id,
                            "message_type": message_type,
                            "source_type": source_type,
                        },
                    )
                )
            return message, saved_attachments
        except IntegrityError:
            if attempt >= 2:
                raise
            continue
    raise RuntimeError("failed to create message")


def mark_conversation_read(
    session: Session,
    conversation_id: str,
    user_id: str,
    last_read_seq: int | None,
) -> dict[str, Any]:
    member_query = (
        session.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id,
        )
    )
    if _supports_for_update(session):
        member_query = member_query.with_for_update()
    member = member_query.first()
    if member is None:
        raise ValueError("Conversation member not found")

    effective_seq = last_read_seq
    if effective_seq is None:
        effective_seq = session.query(func.max(Message.seq)).filter(Message.conversation_id == conversation_id).scalar() or 0

    effective_seq = max(member.last_read_seq, int(effective_seq or 0))

    last_message = (
        session.query(Message)
        .filter(Message.conversation_id == conversation_id, Message.seq == effective_seq)
        .first()
    )

    member.last_read_seq = effective_seq
    member.last_read_message_id = last_message.id if last_message else member.last_read_message_id

    unread_count = (
        session.query(func.count(Message.id))
        .filter(
            Message.conversation_id == conversation_id,
            Message.seq > effective_seq,
            Message.sender_id != user_id,
        )
        .scalar()
        or 0
    )
    member.unread_count = int(unread_count)

    session.add(
        EventLog(
            user_id=user_id,
            event_type="conversation_read",
            target_id=conversation_id,
            extra_json={"last_read_seq": effective_seq},
        )
    )

    return {
        "conversation_id": conversation_id,
        "user_id": user_id,
        "last_read_seq": effective_seq,
        "unread_count": member.unread_count,
    }


def serialize_ai_session(record: AIChatSession) -> dict[str, Any]:
    return {
        "session_id": record.id,
        "user_id": record.user_id,
        "title": record.title,
        "source": record.source,
        "subject": record.subject,
        "linked_classroom_id": record.linked_classroom_id,
        "linked_conversation_id": record.linked_conversation_id,
        "archived_flag": record.archived_flag,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
    }


def create_ai_session(
    session: Session,
    user_id: str,
    title: str,
    source: str,
    subject: str | None = None,
    linked_classroom_id: str | None = None,
    linked_conversation_id: str | None = None,
) -> AIChatSession:
    _ensure_user(session, user_id)

    record = AIChatSession(
        user_id=user_id,
        title=title,
        source=source,
        subject=subject,
        linked_classroom_id=linked_classroom_id,
        linked_conversation_id=linked_conversation_id,
        archived_flag=False,
    )
    session.add(record)

    session.add(
        EventLog(
            user_id=user_id,
            event_type="ai_session_created",
            target_id=record.id,
            extra_json={"source": source, "subject": subject},
        )
    )

    session.flush()
    return record


def list_ai_sessions(
    session: Session,
    user_id: str,
    limit: int = 50,
    linked_conversation_id: str | None = None,
) -> list[dict[str, Any]]:
    query = session.query(AIChatSession).filter(
        AIChatSession.user_id == user_id,
        AIChatSession.archived_flag == False,  # noqa: E712
    )
    if linked_conversation_id:
        query = query.filter(AIChatSession.linked_conversation_id == linked_conversation_id)

    rows = query.order_by(AIChatSession.updated_at.desc()).limit(max(1, min(limit, 200))).all()
    return [serialize_ai_session(row) for row in rows]


def serialize_ai_message(message: AIChatMessage) -> dict[str, Any]:
    return {
        "message_id": message.id,
        "session_id": message.session_id,
        "role": message.role,
        "content": message.content,
        "content_type": message.content_type,
        "model_name": message.model_name,
        "prompt_tokens": message.prompt_tokens,
        "completion_tokens": message.completion_tokens,
        "total_tokens": message.total_tokens,
        "latency_ms": message.latency_ms,
        "request_id": message.request_id,
        "parent_message_id": message.parent_message_id,
        "created_at": message.created_at.isoformat(),
    }


def list_ai_messages(session: Session, session_id: str, limit: int = 200) -> list[dict[str, Any]]:
    rows = (
        session.query(AIChatMessage)
        .filter(AIChatMessage.session_id == session_id)
        .order_by(AIChatMessage.created_at.asc())
        .limit(max(1, min(limit, 500)))
        .all()
    )
    return [serialize_ai_message(row) for row in rows]


def create_ai_message(
    session: Session,
    session_id: str,
    role: str,
    content: str,
    user_id: str | None = None,
    content_type: str = "text",
    model_name: str | None = None,
    prompt_tokens: int | None = None,
    completion_tokens: int | None = None,
    total_tokens: int | None = None,
    latency_ms: int | None = None,
    request_id: str | None = None,
    parent_message_id: str | None = None,
) -> AIChatMessage:
    ai_session = session.get(AIChatSession, session_id)
    if not ai_session:
        raise ValueError("AI session not found")

    if user_id and ai_session.user_id != user_id:
        raise ValueError("AI session does not belong to user")

    if request_id:
        existing = session.query(AIChatMessage).filter(AIChatMessage.request_id == request_id).first()
        if existing:
            return existing

    try:
        with session.begin_nested():
            message = AIChatMessage(
                session_id=session_id,
                role=role,
                content=content,
                content_type=content_type,
                model_name=model_name,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                latency_ms=latency_ms,
                request_id=request_id,
                parent_message_id=parent_message_id,
            )
            session.add(message)
            session.flush()
    except IntegrityError:
        if request_id:
            existing = session.query(AIChatMessage).filter(AIChatMessage.request_id == request_id).first()
            if existing:
                return existing
        raise

    ai_session.updated_at = _utcnow()

    session.add(
        EventLog(
            user_id=ai_session.user_id,
            event_type="ai_message_created",
            target_id=message.id,
            extra_json={"session_id": session_id, "role": role},
        )
    )

    return message


def upsert_ai_feedback(
    session: Session,
    message_id: str,
    user_id: str,
    rating: str,
    feedback_text: str | None = None,
) -> AIMessageFeedback:
    _ensure_user(session, user_id)

    feedback = (
        session.query(AIMessageFeedback)
        .filter(
            AIMessageFeedback.message_id == message_id,
            AIMessageFeedback.user_id == user_id,
        )
        .first()
    )

    if feedback is not None:
        feedback.rating = rating
        feedback.feedback_text = feedback_text
        session.flush()
        return feedback

    try:
        with session.begin_nested():
            feedback = AIMessageFeedback(
                message_id=message_id,
                user_id=user_id,
                rating=rating,
                feedback_text=feedback_text,
            )
            session.add(feedback)
            session.flush()
    except IntegrityError:
        feedback = (
            session.query(AIMessageFeedback)
            .filter(
                AIMessageFeedback.message_id == message_id,
                AIMessageFeedback.user_id == user_id,
            )
            .first()
        )
        if feedback is None:
            raise
        feedback.rating = rating
        feedback.feedback_text = feedback_text
        session.flush()
    return feedback


def serialize_ai_feedback(feedback: AIMessageFeedback) -> dict[str, Any]:
    return {
        "feedback_id": feedback.id,
        "message_id": feedback.message_id,
        "user_id": feedback.user_id,
        "rating": feedback.rating,
        "feedback_text": feedback.feedback_text,
        "created_at": feedback.created_at.isoformat(),
    }


_SUBJECT_RULES: list[tuple[str, str]] = [
    (r"函数|导数|极限|方程|几何|三角|概率|数学", "数学"),
    (r"物理|力学|电路|速度|加速度", "物理"),
    (r"化学|分子|离子|反应", "化学"),
    (r"英语|语法|单词|阅读", "英语"),
]


_KNOWLEDGE_KEYWORDS = [
    "二次函数",
    "一次函数",
    "几何",
    "三角函数",
    "导数",
    "极限",
    "概率",
    "方程",
    "不等式",
    "牛顿定律",
    "电路",
    "化学反应",
]


_CONFUSION_PATTERN = re.compile(r"不会|不懂|为什么|看不懂|疑惑|卡住|\?|？")


def _detect_subject(text: str) -> str:
    for pattern, subject in _SUBJECT_RULES:
        if re.search(pattern, text):
            return subject
    return "综合"


def _extract_knowledge_points(text: str) -> list[str]:
    hits: list[str] = []
    for keyword in _KNOWLEDGE_KEYWORDS:
        if keyword in text:
            hits.append(keyword)
    if hits:
        return list(dict.fromkeys(hits))

    snippet = text.strip().replace("\n", " ")
    if not snippet:
        return []
    return [snippet[: min(20, len(snippet))]]


def _detect_question_type(text: str) -> str:
    if "证明" in text:
        return "proof"
    if "计算" in text or "求" in text:
        return "calculation"
    if "选择" in text:
        return "multiple_choice"
    return "qa"


def _detect_difficulty(text: str) -> str:
    if re.search(r"竞赛|压轴|复杂|很难", text):
        return "hard"
    if re.search(r"基础|入门|简单", text):
        return "easy"
    return "medium"


def extract_learning_records(
    session: Session,
    ai_session_id: str,
    user_id: str | None = None,
    extract_version: str = "v1",
) -> dict[str, Any]:
    ai_session = session.get(AIChatSession, ai_session_id)
    if not ai_session:
        raise ValueError("AI session not found")

    if user_id and user_id != ai_session.user_id:
        raise ValueError("AI session does not belong to user")

    owner_id = ai_session.user_id

    messages = (
        session.query(AIChatMessage)
        .filter(AIChatMessage.session_id == ai_session_id)
        .order_by(AIChatMessage.created_at.asc())
        .all()
    )

    if not messages:
        return {
            "session_id": ai_session_id,
            "user_id": owner_id,
            "records_created": 0,
            "subjects": [],
            "knowledge_points": [],
            "extract_version": extract_version,
        }

    created = 0
    subjects: set[str] = set()
    knowledge_points: set[str] = set()

    weak_subjects: set[str] = set()
    weak_points: set[str] = set()

    for message in messages:
        if message.role != "user":
            continue

        text = (message.content or "").strip()
        if not text:
            continue

        subject = _detect_subject(text)
        kps = _extract_knowledge_points(text)
        confusion = bool(_CONFUSION_PATTERN.search(text))
        question_type = _detect_question_type(text)
        difficulty = _detect_difficulty(text)

        subjects.add(subject)
        for kp in kps:
            knowledge_points.add(kp)
            exists = (
                session.query(AILearningRecord.id)
                .filter(
                    AILearningRecord.session_id == ai_session_id,
                    AILearningRecord.message_id == message.id,
                    AILearningRecord.knowledge_point == kp,
                    AILearningRecord.extract_version == extract_version,
                )
                .first()
            )
            if exists:
                continue

            session.add(
                AILearningRecord(
                    id=str(uuid4()),
                    user_id=owner_id,
                    session_id=ai_session_id,
                    message_id=message.id,
                    subject=subject,
                    knowledge_point=kp,
                    question_type=question_type,
                    difficulty=difficulty,
                    solved_flag=False,
                    confusion_flag=confusion,
                    extract_version=extract_version,
                )
            )
            created += 1

            if confusion:
                weak_subjects.add(subject)
                weak_points.add(kp)

    profile = session.get(StudentProfile, owner_id)
    if profile is None:
        profile = StudentProfile(
            user_id=owner_id,
            weak_subjects=[],
            weak_knowledge_points=[],
            recent_focus=next(iter(subjects), None),
        )
        session.add(profile)

    merged_subjects = set(profile.weak_subjects or [])
    merged_points = set(profile.weak_knowledge_points or [])
    merged_subjects.update(weak_subjects)
    merged_points.update(weak_points)

    profile.weak_subjects = sorted(merged_subjects)
    profile.weak_knowledge_points = sorted(merged_points)
    if subjects:
        profile.recent_focus = next(iter(subjects))

    session.add(
        EventLog(
            user_id=owner_id,
            event_type="learning_records_extracted",
            target_id=ai_session_id,
            extra_json={"records_created": created, "extract_version": extract_version},
        )
    )

    return {
        "session_id": ai_session_id,
        "user_id": owner_id,
        "records_created": created,
        "subjects": sorted(subjects),
        "knowledge_points": sorted(knowledge_points),
        "extract_version": extract_version,
    }
