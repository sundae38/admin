"""제네릭 CRUD 라우터 팩토리 — 엔터티별 목록/조회/생성/수정/삭제 + 감사 이력."""
from typing import Type

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User
from app.services import audit


def build_crud_router(
    *,
    prefix: str,
    tag: str,
    model: Type,
    create_schema: Type,
    update_schema: Type,
    out_schema: Type,
    entity_label: str | None = None,
    parent_field: str = "project_id",
) -> APIRouter:
    router = APIRouter(
        prefix=prefix, tags=[tag], dependencies=[Depends(get_current_user)]
    )

    def _project_id_of(obj) -> int | None:
        if tag == "projects":
            return obj.id
        return getattr(obj, "project_id", None)

    @router.get("", response_model=list[out_schema])
    def list_items(
        project_id: int | None = Query(None),
        program_id: int | None = Query(None),
        db: Session = Depends(get_db),
    ):
        q = db.query(model)
        if project_id is not None and hasattr(model, "project_id"):
            q = q.filter(model.project_id == project_id)
        if program_id is not None and hasattr(model, "program_id"):
            q = q.filter(model.program_id == program_id)
        return q.order_by(model.id.desc()).all()

    @router.get("/{item_id}", response_model=out_schema)
    def get_item(item_id: int, db: Session = Depends(get_db)):
        obj = db.get(model, item_id)
        if obj is None:
            raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")
        return obj

    @router.post("", response_model=out_schema, status_code=201)
    def create_item(
        payload: create_schema,  # type: ignore
        db: Session = Depends(get_db),
        current: User = Depends(get_current_user),
    ):
        data = payload.model_dump()
        obj = model(**data)
        if hasattr(obj, "created_by"):
            obj.created_by = current.name
            obj.updated_by = current.name
        db.add(obj)
        db.flush()  # id 확보
        audit.record(
            db,
            entity_type=tag,
            entity_label=entity_label,
            entity_id=obj.id,
            project_id=_project_id_of(obj),
            action="create",
            actor=current.name,
            summary=audit.summarize(obj),
            changes=audit.diff({}, data),
        )
        db.commit()
        db.refresh(obj)
        return obj

    @router.put("/{item_id}", response_model=out_schema)
    def update_item(
        item_id: int,
        payload: update_schema,  # type: ignore
        db: Session = Depends(get_db),
        current: User = Depends(get_current_user),
    ):
        obj = db.get(model, item_id)
        if obj is None:
            raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")
        new_values = payload.model_dump(exclude_unset=True)
        old_values = {k: getattr(obj, k, None) for k in new_values}
        changes = audit.diff(old_values, new_values)
        for key, value in new_values.items():
            setattr(obj, key, value)
        if hasattr(obj, "updated_by"):
            obj.updated_by = current.name
        if changes:  # 실제 변경이 있을 때만 이력 적재
            audit.record(
                db,
                entity_type=tag,
                entity_label=entity_label,
                entity_id=obj.id,
                project_id=_project_id_of(obj),
                action="update",
                actor=current.name,
                summary=audit.summarize(obj),
                changes=changes,
            )
        db.commit()
        db.refresh(obj)
        return obj

    @router.delete("/{item_id}", status_code=204)
    def delete_item(
        item_id: int,
        db: Session = Depends(get_db),
        current: User = Depends(get_current_user),
    ):
        obj = db.get(model, item_id)
        if obj is None:
            raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")
        audit.record(
            db,
            entity_type=tag,
            entity_label=entity_label,
            entity_id=obj.id,
            project_id=_project_id_of(obj),
            action="delete",
            actor=current.name,
            summary=audit.summarize(obj),
        )
        db.delete(obj)
        db.commit()

    return router
