from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.core.database import get_db
from app.core.deps import get_current_user
from app.schemas import OverviewKPI, ProjectKPI
from app.services import kpi as kpi_service

router = APIRouter(
    prefix="/api/kpi", tags=["kpi"], dependencies=[Depends(get_current_user)]
)


@router.get("/overview", response_model=OverviewKPI)
def overview(
    year: int | None = None,
    project_type: str | None = None,
    db: Session = Depends(get_db),
):
    return kpi_service.compute_overview(db, year, project_type)


@router.get("/project/{project_id}", response_model=ProjectKPI)
def project_kpi(project_id: int, db: Session = Depends(get_db)):
    project = (
        db.query(models.Project)
        .options(*kpi_service.project_load_options())
        .filter(models.Project.id == project_id)
        .first()
    )
    if project is None:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")
    return kpi_service.compute_project_kpi(db, project)
