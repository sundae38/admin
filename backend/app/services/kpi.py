"""KPI 집계·계산식 — 계획서의 KPI 표를 구현한다."""
from collections import Counter, defaultdict

from sqlalchemy.orm import Session

from app import models
from app.constants import FUND_FIELDS
from app.schemas import (
    AmountItem,
    BudgetExecution,
    BudgetLine,
    Distribution,
    ItemScore,
    OverviewKPI,
    ProjectKPI,
)


def _round(value: float, digits: int = 1) -> float:
    return round(value, digits)


def _rate(paid: float, budget: float) -> float:
    return _round(paid / budget * 100) if budget > 0 else 0.0


def _distribution(values: list[str | None]) -> list[Distribution]:
    counter = Counter((v or "미상") for v in values)
    return [
        Distribution(label=label, value=count)
        for label, count in sorted(counter.items(), key=lambda x: (-x[1], x[0]))
    ]


def _weighted_distribution(pairs) -> list[Distribution]:
    """(라벨, 인원수) 목록을 인원수 가중으로 집계."""
    counter: dict[str, int] = defaultdict(int)
    for label, weight in pairs:
        counter[label or "미상"] += weight
    return [
        Distribution(label=label, value=count)
        for label, count in sorted(counter.items(), key=lambda x: (-x[1], x[0]))
    ]


def _special_care_distribution(participants) -> tuple[int, list[Distribution]]:
    """교육적 배려대상: 선발인원 중 배려대상(1종 이상) 수 + 항목별 분포(중복 포함)."""
    care_count = 0
    counter: Counter = Counter()
    for p in participants:
        cats = p.special_categories or []
        if cats:
            care_count += 1
            for c in cats:
                counter[c] += 1
    dist = [
        Distribution(label=label, value=count)
        for label, count in sorted(counter.items(), key=lambda x: (-x[1], x[0]))
    ]
    return care_count, dist


def _paid_by_category(payments) -> dict[str, float]:
    by_cat: dict[str, float] = defaultdict(float)
    for p in payments:
        by_cat[p.budget_category or "지원금"] += p.paid_amount
    return by_cat


def _satisfaction_items(surveys) -> list[ItemScore]:
    """전체 만족도 설문의 항목별 점수를 항목명 기준 평균."""
    acc: dict[str, list[float]] = defaultdict(list)
    for s in surveys:
        if s.survey_type == "전체" and s.item_scores:
            for label, score in s.item_scores.items():
                try:
                    acc[label].append(float(score))
                except (TypeError, ValueError):
                    continue
    return [
        ItemScore(label=label, score=_round(sum(v) / len(v), 2))
        for label, v in acc.items()
    ]


def compute_project_kpi(db: Session, project: models.Project) -> ProjectKPI:
    participants = project.participants

    # 예산 집행 — 용도별
    paid_by_cat = _paid_by_category(project.payments)
    # 심사관리비/사업관리비: 예산과목 입력(계획금액=예산) 합계 대비 집행액 합계
    planned_by_cat: dict[str, float] = defaultdict(float)
    for p in project.payments:
        planned_by_cat[p.budget_category or "지원금"] += p.planned_amount or 0.0
    total_budget = project.total_budget or 0.0
    grant_budget = project.budget_grant or 0.0

    # 지원금 지원내역 세분 (최초지급/추가지급/반환)
    grant_payments = [p for p in project.payments if (p.budget_category or "지원금") == "지원금"]
    grant_initial = sum(p.paid_amount for p in grant_payments if p.grant_kind == "최초지급")
    grant_additional = sum(p.paid_amount for p in grant_payments if p.grant_kind == "추가지급")
    grant_returned = sum(p.paid_amount for p in grant_payments if p.grant_kind == "반환")
    # 실집행액 = 최초지급 + 추가지급 - 반환
    grant_paid = grant_initial + grant_additional - grant_returned
    # 집행잔액 = 지원금 총예산 - 실집행액
    grant_remaining = grant_budget - grant_paid
    grant_initial_headcount = sum(
        p.initial_headcount for p in grant_payments if p.grant_kind == "최초지급"
    )
    # 지원인원 = 최초지급 인원 + 추가지급 인원 − 반환 인원
    grant_additional_hc = sum(
        p.initial_headcount for p in grant_payments if p.grant_kind == "추가지급"
    )
    grant_returned_hc = sum(
        p.initial_headcount for p in grant_payments if p.grant_kind == "반환"
    )
    grant_support_headcount = grant_initial_headcount + grant_additional_hc - grant_returned_hc

    # 선발인원 = 지급인원(최초지급 인원수) 합, 없으면 선발자 수
    initial_records = [p for p in grant_payments if p.grant_kind == "최초지급"]
    has_grant = len(initial_records) > 0
    selected_count = grant_initial_headcount if has_grant else len(participants)

    # 세부구성(내부 데이터 관리용): 지급인원과 별개로 직접 입력한 성별/학교급/교육약자 인원을 합산.
    def _sum_maps(records, attr) -> dict[str, int]:
        counter: dict[str, int] = defaultdict(int)
        for r in records:
            for key, val in (getattr(r, attr) or {}).items():
                try:
                    counter[key] += int(val)
                except (TypeError, ValueError):
                    continue
        return counter

    gender_counter = _sum_maps(initial_records, "gender_counts")
    school_counter = _sum_maps(initial_records, "school_counts")
    care_counter = _sum_maps(initial_records, "care_counts")
    has_demo = bool(gender_counter or school_counter or care_counter)

    region_dist: list[Distribution] = []
    age_dist: list[Distribution] = []
    category_dist: list[Distribution] = []
    if has_demo:
        _mk = lambda c: [
            Distribution(label=l, value=v) for l, v in sorted(c.items(), key=lambda x: (-x[1], x[0]))
        ]
        gender_dist = _mk(gender_counter)
        school_dist = _mk(school_counter)
        care_dist = _mk(care_counter)
        care_count = sum(care_counter.values())
    elif participants:
        gender_dist = _distribution([p.gender for p in participants])
        school_dist = _distribution([p.school_level for p in participants])
        region_dist = _distribution([p.region for p in participants])
        age_dist = _distribution([p.age_group for p in participants])
        category_dist = _distribution([p.category for p in participants])
        care_count, care_dist = _special_care_distribution(participants)
    else:
        gender_dist = []
        school_dist = []
        care_dist = []
        care_count = 0

    competition_rate = (
        _round(project.applicant_count / selected_count, 2) if selected_count > 0 else 0.0
    )

    # 총 집행액 = 비지원금 지급 + 지원금 실집행
    non_grant_paid = sum(
        p.paid_amount for p in project.payments if (p.budget_category or "지원금") != "지원금"
    )
    total_paid = non_grant_paid + grant_paid

    budget_lines = [
        BudgetLine(
            label="장학금(지원금)",
            budget=grant_budget,
            paid=grant_paid,
            rate=_rate(grant_paid, grant_budget),
        ),
        BudgetLine(
            label="심사관리비",
            budget=planned_by_cat.get("심사관리비", 0.0) or (project.budget_review or 0.0),
            paid=paid_by_cat.get("심사관리비", 0.0),
            rate=_rate(
                paid_by_cat.get("심사관리비", 0.0),
                planned_by_cat.get("심사관리비", 0.0) or (project.budget_review or 0.0),
            ),
        ),
        BudgetLine(
            label="사업관리비",
            budget=planned_by_cat.get("사업관리비", 0.0) or (project.budget_program or 0.0),
            paid=paid_by_cat.get("사업관리비", 0.0),
            rate=_rate(
                paid_by_cat.get("사업관리비", 0.0),
                planned_by_cat.get("사업관리비", 0.0) or (project.budget_program or 0.0),
            ),
        ),
    ]

    funding_sources = [
        AmountItem(label=name, amount=getattr(project, field) or 0.0)
        for field, name in FUND_FIELDS.items()
    ]

    # 프로그램 참여율
    total_target = sum(pr.target_count for pr in project.programs)
    total_attended = sum(
        sum(1 for part in pr.participations if part.attended) for pr in project.programs
    )
    participation_rate = _rate(total_attended, total_target)

    def _weighted_avg(surveys) -> float:
        total_resp = sum(s.respondent_count for s in surveys)
        if total_resp > 0:
            return _round(
                sum(s.avg_score * s.respondent_count for s in surveys) / total_resp, 2
            )
        if surveys:
            return _round(sum(s.avg_score for s in surveys) / len(surveys), 2)
        return 0.0

    program_surveys = [s for s in project.surveys if s.survey_type == "프로그램"]
    overall_surveys = [s for s in project.surveys if s.survey_type == "전체"]
    program_satisfaction = _weighted_avg(program_surveys)
    overall_satisfaction = _weighted_avg(overall_surveys)

    achievements = [
        min(m.actual_value / m.target_value * 100, 999)
        for m in project.growth_metrics
        if m.target_value
    ]
    growth_achievement_rate = (
        _round(sum(achievements) / len(achievements)) if achievements else 0.0
    )

    return ProjectKPI(
        project_id=project.id,
        project_name=project.name,
        project_type=project.project_type or "기타",
        year=project.year,
        status=project.status,
        selected_count=selected_count,
        target_headcount=project.target_headcount,
        applicant_count=project.applicant_count,
        competition_rate=competition_rate,
        total_budget=total_budget,
        total_paid=total_paid,
        execution_rate=_rate(total_paid, total_budget),
        grant_budget=grant_budget,
        grant_initial=grant_initial,
        grant_additional=grant_additional,
        grant_returned=grant_returned,
        grant_paid=grant_paid,
        grant_remaining=grant_remaining,
        grant_execution_rate=_rate(grant_paid, grant_budget),
        grant_initial_headcount=grant_initial_headcount,
        grant_support_headcount=grant_support_headcount,
        budget_lines=budget_lines,
        funding_sources=funding_sources,
        program_participation_rate=participation_rate,
        program_satisfaction=program_satisfaction,
        overall_satisfaction=overall_satisfaction,
        satisfaction_items=_satisfaction_items(project.surveys),
        growth_achievement_rate=growth_achievement_rate,
        partner_count=len(project.partners),
        special_care_count=care_count,
        special_care_distribution=care_dist,
        gender_distribution=gender_dist,
        age_distribution=age_dist,
        school_distribution=school_dist,
        region_distribution=region_dist,
        category_distribution=category_dist,
    )


def _execution_agg(label: str, kpis: list[ProjectKPI]) -> BudgetExecution:
    total_budget = sum(k.total_budget for k in kpis)
    total_paid = sum(k.total_paid for k in kpis)
    grant_budget = sum(k.grant_budget for k in kpis)
    grant_paid = sum(k.grant_paid for k in kpis)
    return BudgetExecution(
        label=label,
        project_count=len(kpis),
        total_budget=total_budget,
        total_paid=total_paid,
        total_rate=_rate(total_paid, total_budget),
        grant_budget=grant_budget,
        grant_paid=grant_paid,
        grant_rate=_rate(grant_paid, grant_budget),
        grant_remaining=grant_budget - grant_paid,
    )


def _monthly_execution(projects, grant_budget_total: float):
    """월별 지원금 지급·집행 추이 (지급일 기준)."""
    from app.schemas import MonthlyExecution

    paid_by_month: dict[str, float] = defaultdict(float)
    returned_by_month: dict[str, float] = defaultdict(float)
    for project in projects:
        for p in project.payments:
            if (p.budget_category or "지원금") != "지원금" or not p.paid_date:
                continue
            month = p.paid_date.strftime("%Y-%m")
            if p.grant_kind == "반환":
                returned_by_month[month] += p.paid_amount
            else:  # 최초지급 / 추가지급
                paid_by_month[month] += p.paid_amount

    months = sorted(set(paid_by_month) | set(returned_by_month))
    result = []
    cumulative = 0.0
    for m in months:
        paid = paid_by_month.get(m, 0.0)
        returned = returned_by_month.get(m, 0.0)
        net = paid - returned
        cumulative += net
        result.append(
            MonthlyExecution(
                month=m,
                grant_paid=paid,
                returned=returned,
                net_executed=net,
                cumulative_executed=cumulative,
                cumulative_rate=_rate(cumulative, grant_budget_total),
            )
        )
    return result


def compute_overview(
    db: Session, year: int | None = None, project_type: str | None = None
) -> OverviewKPI:
    query = db.query(models.Project)
    if year is not None:
        query = query.filter(models.Project.year == year)
    if project_type:
        query = query.filter(models.Project.project_type == project_type)
    projects = query.order_by(models.Project.year.desc(), models.Project.id.desc()).all()

    project_kpis = [compute_project_kpi(db, p) for p in projects]

    total_selected = sum(k.selected_count for k in project_kpis)
    total_support_headcount = sum(k.grant_support_headcount for k in project_kpis)
    total_budget = sum(k.total_budget for k in project_kpis)
    total_paid = sum(k.total_paid for k in project_kpis)
    total_partners = sum(k.partner_count for k in project_kpis)
    total_special_care = sum(k.special_care_count for k in project_kpis)

    sat_values = [
        k.overall_satisfaction for k in project_kpis if k.overall_satisfaction > 0
    ]
    avg_satisfaction = _round(sum(sat_values) / len(sat_values), 2) if sat_values else 0.0

    # 유형별 집행률
    by_type: dict[str, list[ProjectKPI]] = defaultdict(list)
    for k in project_kpis:
        by_type[k.project_type].append(k)
    execution_by_type = [
        _execution_agg(t, ks) for t, ks in sorted(by_type.items())
    ]
    integrated_execution = _execution_agg("전체", project_kpis)

    grant_budget_total = sum(k.grant_budget for k in project_kpis)
    monthly_execution = _monthly_execution(projects, grant_budget_total)

    # 배려대상·학교급 통합 분포
    care_counter: Counter = Counter()
    school_counter: Counter = Counter()
    for k in project_kpis:
        for d in k.special_care_distribution:
            care_counter[d.label] += d.value
        for d in k.school_distribution:
            if d.label != "미상":
                school_counter[d.label] += d.value
    special_care_distribution = [
        Distribution(label=l, value=v)
        for l, v in sorted(care_counter.items(), key=lambda x: -x[1])
    ]
    school_distribution = [
        Distribution(label=l, value=v)
        for l, v in sorted(school_counter.items(), key=lambda x: -x[1])
    ]

    # 연도별 / 유형별 프로젝트 수 (필터 무시, 전체 집계)
    all_projects = db.query(models.Project.year, models.Project.project_type).all()
    year_counter = Counter(y for (y, _t) in all_projects)
    type_counter = Counter((t or "기타") for (_y, t) in all_projects)
    projects_by_year = [
        Distribution(label=str(y), value=c) for y, c in sorted(year_counter.items())
    ]
    projects_by_type = [
        Distribution(label=t, value=c)
        for t, c in sorted(type_counter.items(), key=lambda x: -x[1])
    ]

    return OverviewKPI(
        total_projects=len(project_kpis),
        total_selected=total_selected,
        total_support_headcount=total_support_headcount,
        total_budget=total_budget,
        total_paid=total_paid,
        overall_execution_rate=_rate(total_paid, total_budget),
        avg_satisfaction=avg_satisfaction,
        total_partners=total_partners,
        total_special_care=total_special_care,
        special_care_distribution=special_care_distribution,
        school_distribution=school_distribution,
        projects_by_year=projects_by_year,
        projects_by_type=projects_by_type,
        execution_by_type=execution_by_type,
        integrated_execution=integrated_execution,
        monthly_execution=monthly_execution,
        projects=project_kpis,
    )
