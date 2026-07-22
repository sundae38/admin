from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.constants import SPECIAL_CARE_CATEGORIES
from app.models import SpecialCategory, User
from app.api import audit, auth, export, imports, kpi, meta, special_categories, users
from app.api.entities import ALL_ENTITY_ROUTERS


_db_initialized = False


def init_db() -> None:
    """테이블 생성, 최초 관리자 계정 및 교육약자 기본 항목 부트스트랩.

    서버리스에서는 모듈 로드(api/index.py)와 lifespan 양쪽에서 호출될 수 있어
    프로세스당 1회만 수행하도록 가드한다(콜드스타트마다의 반영 쿼리 중복 방지).
    """
    global _db_initialized
    if _db_initialized:
        return
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
        # 교육약자 구분 기본값 (비어 있을 때 1회 시드)
        if db.query(SpecialCategory).count() == 0:
            for i, name in enumerate(SPECIAL_CARE_CATEGORIES):
                db.add(SpecialCategory(name=name, sort_order=i))
        db.commit()
        _db_initialized = True
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
app.include_router(special_categories.router)
app.include_router(audit.router)
app.include_router(imports.router)
app.include_router(export.router)
for r in ALL_ENTITY_ROUTERS:
    app.include_router(r)


@app.get("/api/health")
def health():
    return {"status": "ok"}
