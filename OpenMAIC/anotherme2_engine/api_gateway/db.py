"""Database helpers (SQLAlchemy)."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from .config import get_settings


Base = declarative_base()


engine = None
SessionLocal = None


def _create_engine(database_url: str):
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    return create_engine(database_url, future=True, pool_pre_ping=True, connect_args=connect_args)


def reconfigure_db(database_url: str | None = None) -> None:
    global engine, SessionLocal
    db_url = database_url or get_settings().database_url
    if engine is not None:
        engine.dispose()
    engine = _create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False, class_=Session)


reconfigure_db()


def init_db() -> None:
    from . import models  # noqa: F401  # ensure model import side effects

    Base.metadata.create_all(bind=engine)


@contextmanager
def session_scope() -> Iterator[Session]:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
