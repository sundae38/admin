from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models
from app.constants import BUDGET_CATEGORIES, GRANT_TYPES, SCHOOL_LEVELS
from app.core.database import get_db
from app.core.deps import get_current_user

router = APIRouter(
    prefix="/api/meta", tags=["meta"], dependencies=[Depends(get_current_user)]
)


@router.get("")
def meta(db: Session = Depends(get_db)):
    # 현재 등록된 프로젝트 유형(자유 입력값)도 함께 제공 → 입력 자동완성용
    types = [
        t[0]
        for t in db.query(models.Project.project_type)
        .distinct()
        .order_by(models.Project.project_type)
        .all()
        if t[0]
    ]
    # 교육약자 구분은 DB 마스터(관리자 관리)에서 제공
    special = [
        c.name
        for c in db.query(models.SpecialCategory)
        .order_by(models.SpecialCategory.sort_order, models.SpecialCategory.name)
        .all()
    ]
    return {
        "school_levels": SCHOOL_LEVELS,
        "special_care_categories": special,
        "grant_types": GRANT_TYPES,
        "budget_categories": BUDGET_CATEGORIES,
        "project_types": types,
    }
