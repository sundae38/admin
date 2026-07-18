"""데모 시드 데이터 생성 — `python -m app.seed` 로 실행.

기존 데이터를 지우고 프로젝트와 하위 데이터를 생성한다.
"""
import random
from datetime import date

from app.core.database import Base, SessionLocal, engine
from app import models
from app.constants import SCHOOL_LEVELS, SPECIAL_CARE_CATEGORIES
from app.services import audit

GENDERS = ["남", "여"]
AGES = ["10대", "20대", "30대", "40대 이상"]
REGIONS = ["서울", "경기", "부산", "대구", "광주", "대전", "기타"]
CATEGORIES = ["재학", "휴학", "졸업예정", "일반"]
PROGRAM_TYPES = ["멘토링", "교육", "특강", "워크숍"]
PARTNER_TYPES = ["대학", "기업", "공공기관", "협회"]

# (명칭, 유형, 연도, 총예산, 목표선발, 지원자, 상태)
PROJECTS = [
    ("2024 청년 성장지원 사업", "역량강화사업", 2024, 500_000_000, 60, 320, "완료"),
    ("2024 창업 부트캠프", "창업지원사업", 2024, 300_000_000, 30, 145, "완료"),
    ("2025 미래인재 장학 프로그램", "장학사업", 2025, 800_000_000, 100, 640, "진행중"),
    ("2025 지역청년 역량강화", "역량강화사업", 2025, 250_000_000, 40, 180, "진행중"),
    ("2025 글로벌 리더십 과정", "장학사업", 2025, 420_000_000, 25, 210, "예정"),
]


def _rand_date(year: int) -> date:
    return date(year, random.randint(1, 12), random.randint(1, 28))


def _split_budget(total: float) -> dict:
    grant = round(total * 0.80)
    review = round(total * 0.06)
    program = total - grant - review
    return {"budget_grant": grant, "budget_review": review, "budget_program": program}


def _split_funds(total: float) -> dict:
    # 재원별 구성 (합계 = 총예산)
    contribution = round(total * 0.55)
    investment = round(total * 0.15)
    carryover = round(total * 0.12)
    donation = round(total * 0.10)
    agency = total - contribution - investment - carryover - donation
    return {
        "fund_contribution": contribution,
        "fund_investment": investment,
        "fund_carryover": carryover,
        "fund_donation": donation,
        "fund_agency": agency,
    }


def _rand_special() -> list:
    # 40% 확률로 배려대상, 그 중 절반은 2종 이상
    if random.random() < 0.4:
        n = random.choice([1, 2, 2, 3])
        return random.sample(SPECIAL_CARE_CATEGORIES, n)
    return []


def run() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        from app.core.config import settings
        from app.core.security import hash_password

        db.add(
            models.User(
                username=settings.FIRST_ADMIN_USERNAME,
                name=settings.FIRST_ADMIN_NAME,
                role="admin",
                hashed_password=hash_password(settings.FIRST_ADMIN_PASSWORD),
            )
        )

        for name, ptype, year, budget, target, applicants, status in PROJECTS:
            project = models.Project(
                name=name,
                project_type=ptype,
                year=year,
                start_date=date(year, 3, 1),
                end_date=date(year, 12, 15),
                total_budget=budget,
                manager=random.choice(["김담당", "이주무", "박매니저"]),
                status=status,
                target_headcount=target,
                applicant_count=applicants,
                description=f"{name} 운영을 위한 사업입니다.",
                **_split_budget(budget),
                **_split_funds(budget),
            )
            db.add(project)
            db.flush()

            # 감사 이력: 초기 프로젝트 생성 기록
            audit.record(
                db,
                entity_type="projects",
                entity_label="프로젝트",
                entity_id=project.id,
                project_id=project.id,
                action="create",
                actor="시스템(초기데이터)",
                summary=project.name,
                changes={"명칭": {"before": None, "after": project.name},
                         "유형": {"before": None, "after": ptype}},
            )

            selected = int(target * random.uniform(0.9, 1.0))
            participants = []
            for _ in range(selected):
                p = models.Participant(
                    project_id=project.id,
                    name=f"참여자{random.randint(1000, 9999)}",
                    gender=random.choice(GENDERS),
                    age_group=random.choice(AGES),
                    school_level=random.choice(SCHOOL_LEVELS),
                    region=random.choice(REGIONS),
                    category=random.choice(CATEGORIES),
                    special_categories=_rand_special(),
                    selected_date=date(year, 3, 15),
                    status="선발",
                )
                db.add(p)
                participants.append(p)
            db.flush()

            exec_ratio = {"완료": 0.98, "진행중": 0.6, "예정": 0.05}[status]

            # 지원금 — 1인당 최초지급 (지급월 분산)
            grant_budget = project.budget_grant
            per_person = grant_budget / max(selected, 1)
            for p in participants:
                paid = per_person if random.random() < exec_ratio else 0
                if not paid:
                    continue
                month = random.randint(3, 11)
                db.add(
                    models.Payment(
                        project_id=project.id,
                        participant_id=p.id,
                        payment_type="장학금",
                        budget_category="지원금",
                        grant_kind="최초지급",
                        initial_headcount=1,
                        planned_amount=per_person,
                        paid_amount=paid,
                        paid_date=date(year, month, random.randint(1, 28)),
                        status="지급완료",
                    )
                )
            # 추가지급 몇 건
            if status != "예정":
                for _ in range(random.randint(2, 5)):
                    db.add(
                        models.Payment(
                            project_id=project.id,
                            payment_type="추가장학금",
                            budget_category="지원금",
                            grant_kind="추가지급",
                            reason=random.choice(["우수활동 인센티브", "긴급생활지원", "성과우수"]),
                            paid_amount=round(per_person * random.uniform(0.3, 0.8)),
                            paid_date=date(year, random.randint(6, 11), random.randint(1, 28)),
                            status="지급완료",
                        )
                    )
                # 반환 몇 건 (중도포기 등)
                for _ in range(random.randint(1, 3)):
                    db.add(
                        models.Payment(
                            project_id=project.id,
                            payment_type="반환",
                            budget_category="지원금",
                            grant_kind="반환",
                            reason=random.choice(["중도포기", "자격상실", "초과지급 환수"]),
                            paid_amount=round(per_person * random.uniform(0.2, 0.6)),
                            paid_date=date(year, random.randint(7, 12), random.randint(1, 28)),
                            status="지급완료",
                        )
                    )

            # 심사관리비 / 프로그램운영비 — 프로젝트 단위 몇 건
            for cat, total_cat in [
                ("심사관리비", project.budget_review),
                ("프로그램운영비", project.budget_program),
            ]:
                n = random.randint(2, 4)
                for i in range(n):
                    planned = total_cat / n
                    paid = planned if random.random() < exec_ratio else 0
                    db.add(
                        models.Payment(
                            project_id=project.id,
                            payment_type=cat,
                            budget_category=cat,
                            planned_amount=planned,
                            paid_amount=paid,
                            paid_date=_rand_date(year) if paid else None,
                            status="지급완료" if paid else "예정",
                        )
                    )

            # 프로그램 + 참여 + 프로그램 만족도
            for _ in range(random.randint(2, 4)):
                prog = models.Program(
                    project_id=project.id,
                    name=f"{random.choice(PROGRAM_TYPES)} 프로그램",
                    program_type=random.choice(PROGRAM_TYPES),
                    start_date=_rand_date(year),
                    target_count=selected,
                )
                db.add(prog)
                db.flush()
                attend_ratio = random.uniform(0.7, 0.95) if status != "예정" else 0.0
                for p in participants:
                    db.add(
                        models.ProgramParticipation(
                            program_id=prog.id,
                            participant_id=p.id,
                            attended=random.random() < attend_ratio,
                        )
                    )
                if status != "예정":
                    db.add(
                        models.Survey(
                            project_id=project.id,
                            program_id=prog.id,
                            survey_type="프로그램",
                            title=f"{prog.name} 만족도",
                            respondent_count=int(selected * 0.8),
                            avg_score=round(random.uniform(3.8, 4.8), 2),
                            conducted_date=_rand_date(year),
                            item_scores={
                                "강사": round(random.uniform(3.8, 4.8), 1),
                                "내용구성": round(random.uniform(3.8, 4.7), 1),
                                "운영": round(random.uniform(3.7, 4.7), 1),
                            },
                        )
                    )

            # 전체 만족도 (항목별 점수 포함)
            if status != "예정":
                items = {
                    "사업 전반": round(random.uniform(3.9, 4.7), 1),
                    "지원금 만족": round(random.uniform(3.8, 4.8), 1),
                    "프로그램 만족": round(random.uniform(3.8, 4.7), 1),
                    "행정 지원": round(random.uniform(3.7, 4.6), 1),
                    "재참여 의향": round(random.uniform(3.9, 4.8), 1),
                }
                db.add(
                    models.Survey(
                        project_id=project.id,
                        survey_type="전체",
                        title="사업 전체 만족도",
                        respondent_count=int(selected * 0.85),
                        avg_score=round(sum(items.values()) / len(items), 2),
                        conducted_date=date(year, 12, 1),
                        item_scores=items,
                    )
                )

            # 성장관리 성과
            for metric in ["역량평가 점수", "목표 달성 과제 수", "취업/창업 성공"]:
                for p in random.sample(participants, min(len(participants), 20)):
                    target_v = random.uniform(70, 100)
                    db.add(
                        models.GrowthMetric(
                            project_id=project.id,
                            participant_id=p.id,
                            metric_name=metric,
                            target_value=target_v,
                            actual_value=target_v * random.uniform(0.7, 1.05),
                            measured_date=date(year, 11, 1),
                        )
                    )

            # 협력기관
            for _ in range(random.randint(2, 5)):
                db.add(
                    models.Partner(
                        project_id=project.id,
                        name=f"{random.choice(['한국', '미래', '드림', '스타'])}"
                        f"{random.choice(['대학교', '(주)', '재단', '센터'])}",
                        partner_type=random.choice(PARTNER_TYPES),
                        contribution="교육 및 멘토링 지원",
                        contact="협력담당자",
                        agreement_start=date(year, 2, 1),
                        agreement_end=date(year, 12, 31),
                        status="협약중" if status != "완료" else "종료",
                    )
                )

        db.commit()

        # 감사 로그: 초기(시드) 데이터 작성자 표기
        for Model in [
            models.Project, models.Participant, models.Payment, models.Program,
            models.ProgramParticipation, models.GrowthMetric, models.Survey, models.Partner,
        ]:
            db.query(Model).update(
                {Model.created_by: "시스템(초기데이터)", Model.updated_by: "시스템(초기데이터)"}
            )
        db.commit()
        print("시드 데이터 생성 완료:", len(PROJECTS), "개 프로젝트")
    finally:
        db.close()


if __name__ == "__main__":
    run()
