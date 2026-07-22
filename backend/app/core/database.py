from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

# SQLite는 스레드 체크 옵션이 필요, PostgreSQL 등은 불필요.
connect_args = (
    {"check_same_thread": False}
    if settings.DATABASE_URL.startswith("sqlite")
    else {}
)

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# 서버리스(원격 Postgres): 워커 프로세스가 재사용되는 동안 커넥션 풀을 유지하되,
# pre_ping으로 끊어진 커넥션을 감지하고 pool_recycle로 Neon 유휴 종료 전에 재생성한다.
engine_kwargs: dict = {"connect_args": connect_args, "pool_pre_ping": True}
if not _is_sqlite:
    engine_kwargs["pool_recycle"] = 300  # 5분 후 커넥션 재생성(원격 유휴 종료 대비)

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI 의존성: 요청마다 DB 세션 제공 후 정리."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
