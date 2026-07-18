"""SQLAlchemy ORM 모델 — 프로젝트 관리 시스템의 전 엔터티."""
from datetime import date, datetime, timezone

from sqlalchemy import (
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class AuditMixin:
    """감사 로그 필드 — 작성자/수정자를 '이름 문자열 스냅샷'으로 저장한다.

    사용자 계정이 변경·삭제(담당자 변동)되어도 기록은 그대로 보존되며,
    Project.manager(현재 담당자)와는 독립적이다.
    """

    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    created_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)
    updated_by: Mapped[str | None] = mapped_column(String(100), nullable=True)


class SpecialCategory(Base):
    """교육약자 구분 마스터 — 관리자가 항목을 생성/관리한다."""

    __tablename__ = "special_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class AuditLog(Base):
    """감사 이력 — 모든 생성/수정/삭제/업로드를 시간순으로 누적(append-only).

    레코드가 삭제되어도 이력은 남도록 외래키를 두지 않고 값 스냅샷으로 보관한다.
    """

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(40), index=True)  # projects, payments...
    entity_label: Mapped[str | None] = mapped_column(String(40), nullable=True)  # 한글 표시명
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    project_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    action: Mapped[str] = mapped_column(String(20))  # create|update|delete|import
    actor: Mapped[str | None] = mapped_column(String(100), nullable=True)  # 작업자(이름 스냅샷)
    summary: Mapped[str | None] = mapped_column(String(300), nullable=True)  # 대상 요약
    changes: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # 변경 전/후
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, index=True)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(20), default="staff")  # admin | staff
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class Project(AuditMixin, Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    project_type: Mapped[str] = mapped_column(String(100), default="기타", index=True)  # 상위 유형
    grant_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 구분(학업장려금 등)
    year: Mapped[int] = mapped_column(Integer, index=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # 예산 — 용도별 세분
    total_budget: Mapped[float] = mapped_column(Float, default=0.0)  # 총예산
    budget_grant: Mapped[float] = mapped_column(Float, default=0.0)  # 지원금
    budget_review: Mapped[float] = mapped_column(Float, default=0.0)  # 심사관리비
    budget_program: Mapped[float] = mapped_column(Float, default=0.0)  # 프로그램 운영비

    # 예산 — 재원별
    fund_contribution: Mapped[float] = mapped_column(Float, default=0.0)  # 출연금
    fund_investment: Mapped[float] = mapped_column(Float, default=0.0)  # 운용소득
    fund_carryover: Mapped[float] = mapped_column(Float, default=0.0)  # 전기이월금
    fund_donation: Mapped[float] = mapped_column(Float, default=0.0)  # 기부금
    fund_agency: Mapped[float] = mapped_column(Float, default=0.0)  # 대행사업비

    manager: Mapped[str | None] = mapped_column(String(100), nullable=True)  # 담당자
    status: Mapped[str] = mapped_column(String(20), default="진행중")  # 예정|진행중|완료
    target_headcount: Mapped[int] = mapped_column(Integer, default=0)  # 목표 선발인원
    applicant_count: Mapped[int] = mapped_column(Integer, default=0)  # 지원자 수(경쟁률용)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    participants: Mapped[list["Participant"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    payments: Mapped[list["Payment"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    programs: Mapped[list["Program"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    growth_metrics: Mapped[list["GrowthMetric"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    surveys: Mapped[list["Survey"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    partners: Mapped[list["Partner"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class Participant(AuditMixin, Base):
    """선발자 — 선발인원·세부구성 산출 기준."""

    __tablename__ = "participants"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)  # 남|여|기타
    age_group: Mapped[str | None] = mapped_column(String(20), nullable=True)  # 연령대
    school_level: Mapped[str | None] = mapped_column(String(30), nullable=True)  # 학교급
    region: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 지역
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 소속/유형
    # 교육적 배려대상 구분 (2종 이상 가능) — 문자열 리스트로 저장
    special_categories: Mapped[list | None] = mapped_column(JSON, nullable=True)
    selected_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="선발")  # 선발|중도포기|수료

    project: Mapped["Project"] = relationship(back_populates="participants")


class Payment(AuditMixin, Base):
    """지급 — 지급관리·집행률 산출 기준."""

    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    participant_id: Mapped[int | None] = mapped_column(
        ForeignKey("participants.id", ondelete="SET NULL"), nullable=True
    )
    payment_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 지급유형
    # 예산 용도 구분: 지원금 | 심사관리비 | 프로그램운영비
    budget_category: Mapped[str] = mapped_column(String(30), default="지원금")
    # 지원금 지원내역 구분: 최초지급 | 추가지급 | 반환
    grant_kind: Mapped[str] = mapped_column(String(20), default="최초지급")
    initial_headcount: Mapped[int] = mapped_column(Integer, default=0)  # 인원수(코호트)
    # 코호트 세부구성 (데이터 관리 중심) — 이 지원내역 인원의 구성
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)  # 성별
    school_level: Mapped[str | None] = mapped_column(String(30), nullable=True)  # 학교급
    special_categories: Mapped[list | None] = mapped_column(JSON, nullable=True)  # 교육약자
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)  # 사유
    planned_amount: Mapped[float] = mapped_column(Float, default=0.0)  # 계획금액
    paid_amount: Mapped[float] = mapped_column(Float, default=0.0)  # 금액(지급/추가/반환)
    paid_date: Mapped[date | None] = mapped_column(Date, nullable=True)  # 일자
    status: Mapped[str] = mapped_column(String(20), default="예정")  # 예정|지급완료|보류

    project: Mapped["Project"] = relationship(back_populates="payments")


class Program(AuditMixin, Base):
    """성장관리 프로그램."""

    __tablename__ = "programs"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    program_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 멘토링|교육|특강
    session_no: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 회차(1회 이상 운영)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    target_count: Mapped[int] = mapped_column(Integer, default=0)  # 대상 인원

    project: Mapped["Project"] = relationship(back_populates="programs")
    participations: Mapped[list["ProgramParticipation"]] = relationship(
        back_populates="program", cascade="all, delete-orphan"
    )

    @property
    def participation_count(self) -> int:
        return sum(1 for p in self.participations if p.attended)


class ProgramParticipation(AuditMixin, Base):
    """프로그램 참여 기록 — 참여율 산출."""

    __tablename__ = "program_participations"

    id: Mapped[int] = mapped_column(primary_key=True)
    program_id: Mapped[int] = mapped_column(
        ForeignKey("programs.id", ondelete="CASCADE"), index=True
    )
    participant_id: Mapped[int | None] = mapped_column(
        ForeignKey("participants.id", ondelete="SET NULL"), nullable=True
    )
    attended: Mapped[bool] = mapped_column(default=False)  # 참여(출석) 여부

    program: Mapped["Program"] = relationship(back_populates="participations")


class GrowthMetric(AuditMixin, Base):
    """성장관리 성과 — 목표 대비 달성률 산출."""

    __tablename__ = "growth_metrics"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    participant_id: Mapped[int | None] = mapped_column(
        ForeignKey("participants.id", ondelete="SET NULL"), nullable=True
    )
    metric_name: Mapped[str] = mapped_column(String(100))  # 지표명
    target_value: Mapped[float] = mapped_column(Float, default=0.0)  # 목표값
    actual_value: Mapped[float] = mapped_column(Float, default=0.0)  # 실적값
    measured_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    project: Mapped["Project"] = relationship(back_populates="growth_metrics")


class Survey(AuditMixin, Base):
    """만족도 설문 — 프로그램/전체 만족도 산출."""

    __tablename__ = "surveys"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    program_id: Mapped[int | None] = mapped_column(
        ForeignKey("programs.id", ondelete="SET NULL"), nullable=True
    )
    survey_type: Mapped[str] = mapped_column(String(20), default="전체")  # 프로그램|전체
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    respondent_count: Mapped[int] = mapped_column(Integer, default=0)  # 응답 수
    avg_score: Mapped[float] = mapped_column(Float, default=0.0)  # 평균 점수(5점 척도)
    conducted_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    item_scores: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # 문항별 점수

    project: Mapped["Project"] = relationship(back_populates="surveys")


class Partner(AuditMixin, Base):
    """협력기관 — 협력기관 현황."""

    __tablename__ = "partners"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    partner_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 유형
    contribution: Mapped[str | None] = mapped_column(Text, nullable=True)  # 협력내용
    contact: Mapped[str | None] = mapped_column(String(100), nullable=True)  # 담당자
    agreement_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    agreement_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="협약중")  # 협약중|종료|예정

    project: Mapped["Project"] = relationship(back_populates="partners")
