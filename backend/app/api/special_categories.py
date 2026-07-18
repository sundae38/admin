from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models import SpecialCategory
from app.schemas import SpecialCategoryCreate, SpecialCategoryOut

router = APIRouter(prefix="/api/special-categories", tags=["special_categories"])


@router.get("", response_model=list[SpecialCategoryOut], dependencies=[Depends(get_current_user)])
def list_categories(db: Session = Depends(get_db)):
    return (
        db.query(SpecialCategory)
        .order_by(SpecialCategory.sort_order, SpecialCategory.name)
        .all()
    )


@router.post("", response_model=SpecialCategoryOut, status_code=201, dependencies=[Depends(require_admin)])
def create_category(payload: SpecialCategoryCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="항목명을 입력하세요.")
    if db.query(SpecialCategory).filter(SpecialCategory.name == name).first():
        raise HTTPException(status_code=400, detail="이미 존재하는 항목입니다.")
    obj = SpecialCategory(name=name, sort_order=payload.sort_order)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{category_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_category(category_id: int, db: Session = Depends(get_db)):
    obj = db.get(SpecialCategory, category_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")
    db.delete(obj)
    db.commit()
