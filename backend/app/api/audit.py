from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models
from app.core.database import get_db
from app.core.deps import require_admin
from app.schemas import AuditLogOut

router = APIRouter(
    prefix="/api/audit", tags=["audit"], dependencies=[Depends(require_admin)]
)


@router.get("", response_model=list[AuditLogOut])
def list_audit(
    project_id: int | None = Query(None),
    entity_type: str | None = Query(None),
    action: str | None = Query(None),
    limit: int = Query(200, le=1000),
    db: Session = Depends(get_db),
):
    """감사 이력 조회 — 최신순. 프로젝트·종류·작업으로 필터."""
    q = db.query(models.AuditLog)
    if project_id is not None:
        q = q.filter(models.AuditLog.project_id == project_id)
    if entity_type:
        q = q.filter(models.AuditLog.entity_type == entity_type)
    if action:
        q = q.filter(models.AuditLog.action == action)
    return q.order_by(models.AuditLog.created_at.desc(), models.AuditLog.id.desc()).limit(limit).all()
