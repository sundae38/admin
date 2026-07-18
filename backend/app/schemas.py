"""Pydantic 스키마 — 요청/응답 검증 및 직렬화."""
from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


# ---------- 감사 로그 (작성자/수정자) ----------
class AuditOut(BaseModel):
    created_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None


# ---------- 감사 이력 (변경 로그) ----------
class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    entity_type: str
    entity_label: Optional[str] = None
    entity_id: Optional[int] = None
    project_id: Optional[int] = None
    action: str
    actor: Optional[str] = None
    summary: Optional[str] = None
    changes: Optional[dict[str, Any]] = None
    created_at: datetime


# ---------- Auth / User ----------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserBase(BaseModel):
    username: str
    name: str
    role: str = "staff"


class UserCreate(UserBase):
    password: str


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class LoginRequest(BaseModel):
    username: str
    password: str


# ---------- Project ----------
class ProjectBase(BaseModel):
    name: str
    project_type: str = "기타"
    year: int
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    # 예산 — 용도별
    total_budget: float = 0.0
    budget_grant: float = 0.0
    budget_review: float = 0.0
    budget_program: float = 0.0
    # 예산 — 재원별
    fund_contribution: float = 0.0
    fund_investment: float = 0.0
    fund_carryover: float = 0.0
    fund_donation: float = 0.0
    fund_agency: float = 0.0
    manager: Optional[str] = None
    status: str = "진행중"
    target_headcount: int = 0
    applicant_count: int = 0
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    project_type: Optional[str] = None
    year: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_budget: Optional[float] = None
    budget_grant: Optional[float] = None
    budget_review: Optional[float] = None
    budget_program: Optional[float] = None
    fund_contribution: Optional[float] = None
    fund_investment: Optional[float] = None
    fund_carryover: Optional[float] = None
    fund_donation: Optional[float] = None
    fund_agency: Optional[float] = None
    manager: Optional[str] = None
    status: Optional[str] = None
    target_headcount: Optional[int] = None
    applicant_count: Optional[int] = None
    description: Optional[str] = None


class ProjectOut(ProjectBase, AuditOut):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Participant ----------
class ParticipantBase(BaseModel):
    project_id: int
    name: str
    gender: Optional[str] = None
    age_group: Optional[str] = None
    school_level: Optional[str] = None
    region: Optional[str] = None
    category: Optional[str] = None
    special_categories: Optional[list[str]] = None
    selected_date: Optional[date] = None
    status: str = "선발"


class ParticipantCreate(ParticipantBase):
    pass


class ParticipantUpdate(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    age_group: Optional[str] = None
    school_level: Optional[str] = None
    region: Optional[str] = None
    category: Optional[str] = None
    special_categories: Optional[list[str]] = None
    selected_date: Optional[date] = None
    status: Optional[str] = None


class ParticipantOut(ParticipantBase, AuditOut):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Payment ----------
class PaymentBase(BaseModel):
    project_id: int
    participant_id: Optional[int] = None
    payment_type: Optional[str] = None
    budget_category: str = "지원금"
    grant_kind: str = "최초지급"
    initial_headcount: int = 0
    reason: Optional[str] = None
    planned_amount: float = 0.0
    paid_amount: float = 0.0
    paid_date: Optional[date] = None
    status: str = "예정"


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    participant_id: Optional[int] = None
    payment_type: Optional[str] = None
    budget_category: Optional[str] = None
    grant_kind: Optional[str] = None
    initial_headcount: Optional[int] = None
    reason: Optional[str] = None
    planned_amount: Optional[float] = None
    paid_amount: Optional[float] = None
    paid_date: Optional[date] = None
    status: Optional[str] = None


class PaymentOut(PaymentBase, AuditOut):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Program ----------
class ProgramBase(BaseModel):
    project_id: int
    name: str
    program_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    target_count: int = 0


class ProgramCreate(ProgramBase):
    pass


class ProgramUpdate(BaseModel):
    name: Optional[str] = None
    program_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    target_count: Optional[int] = None


class ProgramOut(ProgramBase, AuditOut):
    model_config = ConfigDict(from_attributes=True)
    id: int
    participation_count: int = 0  # 계산 필드(참여자 수)


# ---------- ProgramParticipation ----------
class ParticipationBase(BaseModel):
    program_id: int
    participant_id: Optional[int] = None
    attended: bool = False


class ParticipationCreate(ParticipationBase):
    pass


class ParticipationOut(ParticipationBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- GrowthMetric ----------
class GrowthMetricBase(BaseModel):
    project_id: int
    participant_id: Optional[int] = None
    metric_name: str
    target_value: float = 0.0
    actual_value: float = 0.0
    measured_date: Optional[date] = None


class GrowthMetricCreate(GrowthMetricBase):
    pass


class GrowthMetricUpdate(BaseModel):
    participant_id: Optional[int] = None
    metric_name: Optional[str] = None
    target_value: Optional[float] = None
    actual_value: Optional[float] = None
    measured_date: Optional[date] = None


class GrowthMetricOut(GrowthMetricBase, AuditOut):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Survey ----------
class SurveyBase(BaseModel):
    project_id: int
    program_id: Optional[int] = None
    survey_type: str = "전체"
    title: Optional[str] = None
    respondent_count: int = 0
    avg_score: float = 0.0
    conducted_date: Optional[date] = None
    item_scores: Optional[dict[str, Any]] = None


class SurveyCreate(SurveyBase):
    pass


class SurveyUpdate(BaseModel):
    program_id: Optional[int] = None
    survey_type: Optional[str] = None
    title: Optional[str] = None
    respondent_count: Optional[int] = None
    avg_score: Optional[float] = None
    conducted_date: Optional[date] = None
    item_scores: Optional[dict[str, Any]] = None


class SurveyOut(SurveyBase, AuditOut):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Partner ----------
class PartnerBase(BaseModel):
    project_id: int
    name: str
    partner_type: Optional[str] = None
    contribution: Optional[str] = None
    contact: Optional[str] = None
    agreement_start: Optional[date] = None
    agreement_end: Optional[date] = None
    status: str = "협약중"


class PartnerCreate(PartnerBase):
    pass


class PartnerUpdate(BaseModel):
    name: Optional[str] = None
    partner_type: Optional[str] = None
    contribution: Optional[str] = None
    contact: Optional[str] = None
    agreement_start: Optional[date] = None
    agreement_end: Optional[date] = None
    status: Optional[str] = None


class PartnerOut(PartnerBase, AuditOut):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- KPI (계산 결과) ----------
class Distribution(BaseModel):
    label: str
    value: int


class AmountItem(BaseModel):
    label: str
    amount: float


class BudgetLine(BaseModel):
    """용도별 예산 대비 집행."""
    label: str
    budget: float
    paid: float
    rate: float


class BudgetExecution(BaseModel):
    """유형별/통합 총예산·지원금 집행률."""
    label: str  # 유형명 또는 "전체"
    project_count: int
    total_budget: float
    total_paid: float
    total_rate: float
    grant_budget: float
    grant_paid: float          # 지원금 실집행액(최초+추가-반환)
    grant_rate: float
    grant_remaining: float     # 지원금 집행잔액(총예산-실집행)


class MonthlyExecution(BaseModel):
    """월별 지원금 지급·집행 추이."""
    month: str                 # 'YYYY-MM'
    grant_paid: float          # 최초+추가 지급액(그 달)
    returned: float            # 반환(그 달)
    net_executed: float        # 순집행(그 달) = grant_paid - returned
    cumulative_executed: float # 누적 실집행
    cumulative_rate: float     # 누적 집행률(누적/지원금 총예산)


class ItemScore(BaseModel):
    label: str
    score: float


class ProjectKPI(BaseModel):
    project_id: int
    project_name: str
    project_type: str
    year: int
    status: str
    selected_count: int          # 선발인원
    target_headcount: int
    applicant_count: int
    competition_rate: float      # 경쟁률 (지원/선발)
    total_budget: float
    total_paid: float
    execution_rate: float        # 총예산 대비 집행률 %
    grant_budget: float          # 지원금 예산
    grant_initial: float         # 최초지급 합계
    grant_additional: float      # 추가지급 합계
    grant_returned: float        # 반환 합계
    grant_paid: float            # 지원금 실집행액 = 최초+추가-반환
    grant_remaining: float       # 지원금 집행잔액 = 총예산-실집행
    grant_execution_rate: float  # 지원금 예산 대비 집행률 %
    grant_initial_headcount: int # 최초 선발인원(지급 기준)
    budget_lines: list[BudgetLine]      # 용도별 예산 대비 집행
    funding_sources: list[AmountItem]   # 재원별 예산
    program_participation_rate: float
    program_satisfaction: float
    overall_satisfaction: float
    satisfaction_items: list[ItemScore]  # 전체 만족도 항목별 점수
    growth_achievement_rate: float
    partner_count: int
    special_care_count: int             # 교육적 배려대상 선발인원
    special_care_distribution: list[Distribution]
    gender_distribution: list[Distribution]
    age_distribution: list[Distribution]
    school_distribution: list[Distribution]
    region_distribution: list[Distribution]
    category_distribution: list[Distribution]


class OverviewKPI(BaseModel):
    total_projects: int
    total_selected: int
    total_budget: float
    total_paid: float
    overall_execution_rate: float
    avg_satisfaction: float
    total_partners: int
    total_special_care: int             # 교육적 배려대상 통합 선발인원
    special_care_distribution: list[Distribution]
    school_distribution: list[Distribution]
    projects_by_year: list[Distribution]
    projects_by_type: list[Distribution]
    execution_by_type: list[BudgetExecution]   # 유형별 집행률
    integrated_execution: BudgetExecution      # 유형 통합 집행률
    monthly_execution: list[MonthlyExecution]  # 월별 지원금 집행 추이
    projects: list[ProjectKPI]
