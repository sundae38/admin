"""데이터 내보내기 & 업로드 템플릿 — 엑셀/CSV 다운로드."""
from __future__ import annotations

import io
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

# pandas는 무거운 라이브러리라 콜드스타트를 늦춘다. 다운로드가 일어날 때만 지연 import.

from app import models
from app.core.database import get_db
from app.core.deps import get_current_user
from app.services import importer

router = APIRouter(
    prefix="/api/export", tags=["export"], dependencies=[Depends(get_current_user)]
)

ENTITY_LABELS = {
    "participants": "선발자",
    "payments": "장학금지원내역",
    "partners": "협력기관",
    "growth_metrics": "성장관리성과",
    "surveys": "만족도설문",
}


def _headers(entity: str) -> dict[str, str]:
    """엔터티별 {모델필드: 한글헤더} — 임포트 인식 컬럼과 동일(왕복 호환)."""
    field_map = importer.COLUMN_MAPS[entity]
    return {field: aliases[0] for field, aliases in field_map.items()}


def _records_to_df(entity: str, records) -> "pd.DataFrame":
    import pandas as pd

    headers = _headers(entity)
    rows = []
    for r in records:
        row = {}
        for field, header in headers.items():
            val = getattr(r, field, None)
            if isinstance(val, (list, dict)):
                val = ", ".join(map(str, val)) if val else ""
            row[header] = val
        rows.append(row)
    return pd.DataFrame(rows, columns=list(headers.values()))


def _disposition(filename: str, ext: str) -> str:
    """RFC 5987 — 한글 파일명 인코딩 + ASCII 폴백 (HTTP 헤더는 latin-1만 허용)."""
    return f"attachment; filename=download.{ext}; filename*=UTF-8''{quote(filename + '.' + ext)}"


def _csv_response(df: "pd.DataFrame", filename: str) -> Response:
    data = ("﻿" + df.to_csv(index=False)).encode("utf-8")  # BOM → 엑셀 한글 호환
    return Response(
        content=data,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": _disposition(filename, "csv")},
    )


def _xlsx_response(df: "pd.DataFrame", filename: str) -> Response:
    import pandas as pd

    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="data")
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": _disposition(filename, "xlsx")},
    )


@router.get("/template/{entity}")
def download_template(entity: str):
    """업로드용 빈 템플릿(헤더만) CSV 다운로드."""
    if entity not in importer.COLUMN_MAPS:
        raise HTTPException(status_code=404, detail="알 수 없는 데이터 종류입니다.")
    import pandas as pd

    df = pd.DataFrame(columns=list(_headers(entity).values()))
    label = ENTITY_LABELS.get(entity, entity)
    return _csv_response(df, f"{label}_업로드양식")


@router.get("/{entity}")
def export_entity(
    entity: str,
    project_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    """현재 데이터 내보내기(엑셀). project_id 지정 시 해당 프로젝트만."""
    if entity not in importer.MODEL_BY_ENTITY:
        raise HTTPException(status_code=404, detail="알 수 없는 데이터 종류입니다.")
    model = importer.MODEL_BY_ENTITY[entity]
    q = db.query(model)
    if project_id is not None and hasattr(model, "project_id"):
        q = q.filter(model.project_id == project_id)
    records = q.order_by(model.id).all()
    df = _records_to_df(entity, records)
    label = ENTITY_LABELS.get(entity, entity)
    suffix = f"_project{project_id}" if project_id else "_전체"
    return _xlsx_response(df, f"{label}{suffix}")
