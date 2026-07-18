"""엔터티별 CRUD 라우터를 팩토리로 일괄 생성."""
from app import models, schemas
from app.api.crud_factory import build_crud_router

projects_router = build_crud_router(
    prefix="/api/projects",
    tag="projects",
    entity_label="프로젝트",
    model=models.Project,
    create_schema=schemas.ProjectCreate,
    update_schema=schemas.ProjectUpdate,
    out_schema=schemas.ProjectOut,
)

participants_router = build_crud_router(
    prefix="/api/participants",
    tag="participants",
    entity_label="선발자",
    model=models.Participant,
    create_schema=schemas.ParticipantCreate,
    update_schema=schemas.ParticipantUpdate,
    out_schema=schemas.ParticipantOut,
)

payments_router = build_crud_router(
    prefix="/api/payments",
    tag="payments",
    entity_label="지급/지원금",
    model=models.Payment,
    create_schema=schemas.PaymentCreate,
    update_schema=schemas.PaymentUpdate,
    out_schema=schemas.PaymentOut,
)

programs_router = build_crud_router(
    prefix="/api/programs",
    tag="programs",
    entity_label="프로그램",
    model=models.Program,
    create_schema=schemas.ProgramCreate,
    update_schema=schemas.ProgramUpdate,
    out_schema=schemas.ProgramOut,
)

participations_router = build_crud_router(
    prefix="/api/participations",
    tag="participations",
    entity_label="프로그램참여",
    model=models.ProgramParticipation,
    create_schema=schemas.ParticipationCreate,
    update_schema=schemas.ParticipationCreate,
    out_schema=schemas.ParticipationOut,
)

growth_router = build_crud_router(
    prefix="/api/growth-metrics",
    tag="growth_metrics",
    entity_label="성장관리성과",
    model=models.GrowthMetric,
    create_schema=schemas.GrowthMetricCreate,
    update_schema=schemas.GrowthMetricUpdate,
    out_schema=schemas.GrowthMetricOut,
)

surveys_router = build_crud_router(
    prefix="/api/surveys",
    tag="surveys",
    entity_label="만족도설문",
    model=models.Survey,
    create_schema=schemas.SurveyCreate,
    update_schema=schemas.SurveyUpdate,
    out_schema=schemas.SurveyOut,
)

partners_router = build_crud_router(
    prefix="/api/partners",
    tag="partners",
    entity_label="협력기관",
    model=models.Partner,
    create_schema=schemas.PartnerCreate,
    update_schema=schemas.PartnerUpdate,
    out_schema=schemas.PartnerOut,
)

ALL_ENTITY_ROUTERS = [
    projects_router,
    participants_router,
    payments_router,
    programs_router,
    participations_router,
    growth_router,
    surveys_router,
    partners_router,
]
