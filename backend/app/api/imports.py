from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User
from app.services import importer

router = APIRouter(prefix="/api/imports", tags=["imports"])


@router.get("/columns")
def supported_columns(current: User = Depends(get_current_user)):
    """엔터티별로 인식 가능한 컬럼(헤더) 안내."""
    return {
        entity: {field: aliases for field, aliases in fields.items()}
        for entity, fields in importer.COLUMN_MAPS.items()
    }


@router.post("/{entity}")
async def import_file(
    entity: str,
    project_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """엑셀/CSV 파일을 특정 프로젝트의 엔터티로 일괄 임포트."""
    content = await file.read()
    try:
        result = importer.import_entity(
            db, entity, project_id, content, file.filename or "upload.xlsx",
            actor=current.name,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # 파싱 오류 등
        raise HTTPException(status_code=400, detail=f"파일 처리 오류: {exc}")
    return result
