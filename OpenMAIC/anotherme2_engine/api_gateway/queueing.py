"""Redis queue helper with dead-letter support."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Iterable

import redis


@dataclass
class QueueMessage:
    job_id: str
    job_type: str
    queue_name: str

    def to_json(self) -> str:
        return json.dumps(
            {"job_id": self.job_id, "job_type": self.job_type, "queue_name": self.queue_name},
            ensure_ascii=False,
        )

    @staticmethod
    def from_json(raw: str) -> "QueueMessage":
        data = json.loads(raw)
        return QueueMessage(job_id=data["job_id"], job_type=data["job_type"], queue_name=data["queue_name"])


class RedisQueueClient:
    def __init__(self, redis_url: str):
        self.client = redis.Redis.from_url(redis_url, decode_responses=True)

    def enqueue(self, queue_name: str, message: QueueMessage) -> None:
        self.client.lpush(queue_name, message.to_json())

    def dequeue(self, queue_names: Iterable[str], timeout: int = 5) -> tuple[str, QueueMessage] | None:
        result = self.client.brpop(list(queue_names), timeout=timeout)
        if not result:
            return None
        queue_name, raw = result
        return queue_name, QueueMessage.from_json(raw)

    def push_dead_letter(self, dlq_name: str, message: QueueMessage) -> None:
        self.client.lpush(dlq_name, message.to_json())

    def ping(self) -> bool:
        return bool(self.client.ping())
