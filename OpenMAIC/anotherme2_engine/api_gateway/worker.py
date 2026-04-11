"""Queue worker for gateway jobs."""

from __future__ import annotations

import time

from .config import get_settings
from .db import init_db, reconfigure_db, session_scope
from .job_service import handle_worker_message
from .queueing import RedisQueueClient
from .storage import build_storage


def run_worker() -> None:
    settings = get_settings()
    reconfigure_db(settings.database_url)
    init_db()

    queue_client = RedisQueueClient(settings.redis_url)
    storage = build_storage(settings)
    queue_order = [settings.queue_package, settings.queue_problem_video, settings.queue_course]

    print(f"[gateway-worker] started, queues={queue_order}")

    while True:
        item = queue_client.dequeue(queue_order, timeout=3)
        if not item:
            time.sleep(0.1)
            continue

        _queue_name, message = item
        with session_scope() as session:
            handle_worker_message(
                session=session,
                queue_client=queue_client,
                message=message,
                settings=settings,
                storage=storage,
            )


if __name__ == "__main__":
    run_worker()
