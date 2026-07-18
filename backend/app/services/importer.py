"""엑셀/CSV 임포터 — 분산 데이터를 엔터티별로 통합.

각 엔터티마다 '한글/영문 헤더 → 모델 필드' 매핑을 정의하여
업로드된 파일의 컬럼명이 조금씩 달라도 유연하게 수용한다.
"""
import io
from datetime import date, datetime

import pandas as pd
from sqlalchemy.orm import Session

from app import models
from app.services import audit

# 엔터티별 컬럼 매핑: 모델필드 -> 허용 헤더 목록(소문자 비교)
COLUMN_MAPS: dict[str, dict[str, list[str]]] = {
    "participants": {
        "name": ["이름", "성명", "name"],
        "gender": ["성별", "gender"],
        "age_group": ["연령대", "나이", "연령", "age_group", "age"],
        "school_level": ["학교급", "학교", "학년", "school_level"],
        "region": ["지역", "region"],
        "category": ["소속", "category"],
        "special_categories": ["교육약자", "배려대상", "교육적배려대상", "배려", "special_categories"],
        "selected_date": ["선발일", "선발일자", "selected_date"],
        "status": ["상태", "status"],
    },
    "payments": {
        "payment_type": ["지급유형", "payment_type"],
        "budget_category": ["예산항목", "예산구분", "용도", "budget_category"],
        "grant_kind": ["구분", "지원구분", "지급구분", "grant_kind"],
        "initial_headcount": ["인원수", "지급인원", "최초선발인원", "선발인원", "인원", "initial_headcount"],
        "reason": ["사유", "비고", "reason"],
        "planned_amount": ["계획금액", "계획액", "예산", "planned_amount"],
        "paid_amount": ["금액", "지급액", "실지급액", "집행액", "paid_amount"],
        "paid_date": ["일자", "지급일", "지급일자", "paid_date"],
        "status": ["상태", "status"],
    },
    "partners": {
        "name": ["기관명", "협력기관", "name"],
        "partner_type": ["유형", "구분", "partner_type"],
        "contribution": ["협력내용", "내용", "contribution"],
        "contact": ["담당자", "연락처", "contact"],
        "agreement_start": ["협약시작", "시작일", "agreement_start"],
        "agreement_end": ["협약종료", "종료일", "agreement_end"],
        "status": ["상태", "status"],
    },
    "growth_metrics": {
        "metric_name": ["지표명", "지표", "metric_name"],
        "target_value": ["목표값", "목표", "target_value"],
        "actual_value": ["실적값", "실적", "actual_value"],
        "measured_date": ["측정일", "measured_date"],
    },
    "surveys": {
        "survey_type": ["설문유형", "유형", "survey_type"],
        "title": ["제목", "설문명", "title"],
        "respondent_count": ["응답수", "응답인원", "respondent_count"],
        "avg_score": ["평균점수", "만족도", "점수", "avg_score"],
        "conducted_date": ["실시일", "설문일", "conducted_date"],
    },
}

MODEL_BY_ENTITY = {
    "participants": models.Participant,
    "payments": models.Payment,
    "partners": models.Partner,
    "growth_metrics": models.GrowthMetric,
    "surveys": models.Survey,
}

_DATE_FIELDS = {
    "selected_date", "paid_date", "agreement_start",
    "agreement_end", "measured_date", "conducted_date",
}
_FLOAT_FIELDS = {"planned_amount", "paid_amount", "target_value", "actual_value", "avg_score"}
_INT_FIELDS = {"respondent_count", "initial_headcount"}


def _read_table(content: bytes, filename: str) -> pd.DataFrame:
    name = filename.lower()
    if name.endswith(".csv"):
        try:
            return pd.read_csv(io.BytesIO(content))
        except UnicodeDecodeError:
            return pd.read_csv(io.BytesIO(content), encoding="cp949")
    return pd.read_excel(io.BytesIO(content))


def _coerce(field: str, value):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    if pd.isna(value):
        return None
    if field == "special_categories":
        # "기초생활수급, 한부모가정" 또는 "기초생활수급/한부모가정" → 리스트
        text = str(value).strip()
        if not text:
            return None
        parts = [p.strip() for p in text.replace("/", ",").replace(";", ",").split(",")]
        return [p for p in parts if p] or None
    if field in _DATE_FIELDS:
        if isinstance(value, (datetime, date)):
            return value.date() if isinstance(value, datetime) else value
        parsed = pd.to_datetime(str(value), errors="coerce")
        return parsed.date() if not pd.isna(parsed) else None
    if field in _FLOAT_FIELDS:
        try:
            return float(str(value).replace(",", "").strip())
        except ValueError:
            return None
    if field in _INT_FIELDS:
        try:
            return int(float(str(value).replace(",", "").strip()))
        except ValueError:
            return None
    return str(value).strip()


def import_entity(
    db: Session,
    entity: str,
    project_id: int,
    content: bytes,
    filename: str,
    actor: str | None = None,
) -> dict:
    """파일을 파싱해 지정 프로젝트의 엔터티 레코드로 일괄 생성."""
    if entity not in MODEL_BY_ENTITY:
        raise ValueError(f"지원하지 않는 엔터티: {entity}")

    project = db.get(models.Project, project_id)
    if project is None:
        raise ValueError("프로젝트를 찾을 수 없습니다.")

    df = _read_table(content, filename)
    # 헤더 정규화: 실제 헤더(소문자, 공백제거) -> 원본 헤더
    header_lookup = {str(c).strip().lower(): c for c in df.columns}
    field_map = COLUMN_MAPS[entity]
    Model = MODEL_BY_ENTITY[entity]

    # 모델필드 -> 실제 데이터프레임 컬럼
    resolved: dict[str, str] = {}
    for field, aliases in field_map.items():
        for alias in aliases:
            if alias.lower() in header_lookup:
                resolved[field] = header_lookup[alias.lower()]
                break

    if not resolved:
        raise ValueError(
            f"인식 가능한 컬럼이 없습니다. 지원 컬럼 예: "
            f"{', '.join(a for al in field_map.values() for a in al[:1])}"
        )

    created = 0
    skipped = 0
    for _, row in df.iterrows():
        data = {"project_id": project_id}
        for field, col in resolved.items():
            coerced = _coerce(field, row[col])
            if coerced is not None:
                data[field] = coerced
        # 필수 이름 필드가 있는 엔터티인데 값이 없으면 스킵
        if "name" in field_map and not data.get("name"):
            skipped += 1
            continue
        if entity == "growth_metrics" and not data.get("metric_name"):
            skipped += 1
            continue
        obj = Model(**data)
        # 감사 로그: 업로드한 사용자 기록
        if actor and hasattr(obj, "created_by"):
            obj.created_by = actor
            obj.updated_by = actor
        db.add(obj)
        created += 1

    # 감사 이력: 업로드 1건으로 요약 기록
    ENTITY_LABELS = {
        "participants": "선발자", "payments": "지급/지원금", "partners": "협력기관",
        "growth_metrics": "성장관리성과", "surveys": "만족도설문",
    }
    audit.record(
        db,
        entity_type=entity,
        entity_label=ENTITY_LABELS.get(entity, entity),
        entity_id=None,
        project_id=project_id,
        action="import",
        actor=actor,
        summary=f"{filename} 업로드 ({created}건 추가, {skipped}건 제외)",
        changes={"인식컬럼": list(resolved.keys())},
    )
    db.commit()
    return {
        "entity": entity,
        "created": created,
        "skipped": skipped,
        "matched_columns": resolved,
    }
