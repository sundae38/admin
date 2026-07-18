"""감사 이력 기록 헬퍼 — 세션에 AuditLog 행을 추가한다(커밋은 호출자가 수행)."""
from datetime import date, datetime

from sqlalchemy.orm import Session

from app import models

# 필드 영문명 → 한글 표시명 (변경내용 가독성용, 없으면 원본 사용)
FIELD_LABELS = {
    "name": "명칭", "project_type": "유형", "year": "연도", "status": "상태",
    "total_budget": "총예산", "budget_grant": "지원금예산", "budget_review": "심사관리비",
    "budget_program": "프로그램운영비", "manager": "담당자", "target_headcount": "목표선발인원",
    "applicant_count": "지원자수", "gender": "성별", "age_group": "연령대",
    "school_level": "학교급", "region": "지역", "special_categories": "배려대상",
    "grant_kind": "지원구분", "initial_headcount": "최초선발인원", "reason": "사유",
    "paid_amount": "금액", "planned_amount": "계획금액", "paid_date": "일자",
    "partner_type": "기관유형", "contribution": "협력내용", "contact": "담당자",
    "avg_score": "평균점수", "respondent_count": "응답수", "item_scores": "항목별점수",
    "metric_name": "지표명", "target_value": "목표값", "actual_value": "실적값",
}


def _ser(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def summarize(obj) -> str:
    for attr in ("name", "title", "metric_name"):
        val = getattr(obj, attr, None)
        if val:
            return str(val)
    return f"#{getattr(obj, 'id', '')}"


def diff(old: dict, new: dict) -> dict:
    """변경된 필드만 {필드: {before, after}} 로 반환."""
    result = {}
    for key, new_val in new.items():
        old_val = old.get(key)
        if _ser(old_val) != _ser(new_val):
            label = FIELD_LABELS.get(key, key)
            result[label] = {"before": _ser(old_val), "after": _ser(new_val)}
    return result


def record(
    db: Session,
    *,
    entity_type: str,
    entity_label: str | None,
    entity_id: int | None,
    project_id: int | None,
    action: str,
    actor: str | None,
    summary: str | None = None,
    changes: dict | None = None,
) -> None:
    db.add(
        models.AuditLog(
            entity_type=entity_type,
            entity_label=entity_label,
            entity_id=entity_id,
            project_id=project_id,
            action=action,
            actor=actor,
            summary=summary,
            changes=changes or None,
        )
    )
