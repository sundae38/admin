from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models import User
from app.api import audit, auth, imports, kpi, meta, users
from app.api.entities import ALL_ENTITY_ROUTERS


def init_db() -> None:
    """테이블 생성 및 최초 관리자 계정 부트스트랩."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        exists = db.query(User).filter(User.username == settings.FIRST_ADMIN_USERNAME).first()
        if not exists:
            db.add(
                User(
                    username=settings.FIRST_ADMIN_USERNAME,
                    name=settings.FIRST_ADMIN_NAME,
                    role="admin",
                    hashed_password=hash_password(settings.FIRST_ADMIN_PASSWORD),
                )
            )
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="프로젝트 관리·통합 대시보드 API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(kpi.router)
app.include_router(meta.router)
app.include_router(audit.router)
app.include_router(imports.router)
for r in ALL_ENTITY_ROUTERS:
    app.include_router(r)


@app.get("/api/health")
def health():
    return {"status": "ok"}
