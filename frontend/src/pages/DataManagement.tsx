import { useEffect, useState } from "react";
import api from "../api/client";
import type { Meta, Project } from "../api/types";
import { useAuth } from "../auth";
import ProjectManager from "../components/ProjectManager";
import ParticipantManager from "../components/ParticipantManager";
import GrantManager from "../components/GrantManager";
import MonthlyExpenseGrid from "../components/MonthlyExpenseGrid";
import ProgramManager from "../components/ProgramManager";
import PartnerManager from "../components/PartnerManager";
import SurveyManager from "../components/SurveyManager";
import ImportPanel from "../components/ImportPanel";
import AuditLogPanel from "../components/AuditLogPanel";

export type DMContext = { projects: Project[]; meta: Meta | null; reloadProjects: () => void };

type Tab = "projects" | "participants" | "grants" | "expenses" | "programs" | "partners" | "surveys" | "import" | "audit";

const TABS: { key: Tab; label: string }[] = [
  { key: "projects", label: "프로젝트 관리" },
  { key: "grants", label: "장학금(지원금) 내역" },
  { key: "expenses", label: "기타 지급(월별 지출)" },
  { key: "programs", label: "세부 프로그램 관리" },
  { key: "partners", label: "협력기관 관리" },
  { key: "surveys", label: "만족도 관리" },
  { key: "import", label: "엑셀 가져오기·내보내기" },
  { key: "audit", label: "감사 이력" },
];

export default function DataManagement() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);

  // 감사 이력은 관리자 전용
  const tabs = TABS.filter((t) => t.key !== "audit" || user?.role === "admin");

  function reloadProjects() {
    api.get<Project[]>("/api/projects").then((r) => setProjects(r.data));
  }
  useEffect(() => {
    reloadProjects();
    api.get<Meta>("/api/meta").then((r) => setMeta(r.data));
  }, []);

  const ctx: DMContext = { projects, meta, reloadProjects };

  return (
    <div>
      <h1 className="page-title">데이터 관리</h1>
      <p className="page-sub">프로젝트·선발자·장학금·프로그램·협력기관·만족도를 직접 등록·수정·삭제하거나, 엑셀/CSV로 통합 업로드합니다.</p>
      <div className="tabs">
        {tabs.map((t) => (
          <div key={t.key} className={`tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>{t.label}</div>
        ))}
      </div>
      {tab === "projects" && <ProjectManager ctx={ctx} />}
      {tab === "participants" && <ParticipantManager ctx={ctx} />}
      {tab === "grants" && <GrantManager ctx={ctx} />}
      {tab === "expenses" && <MonthlyExpenseGrid ctx={ctx} />}
      {tab === "programs" && <ProgramManager ctx={ctx} />}
      {tab === "partners" && <PartnerManager ctx={ctx} />}
      {tab === "surveys" && <SurveyManager ctx={ctx} />}
      {tab === "import" && <ImportPanel ctx={ctx} />}
      {tab === "audit" && user?.role === "admin" && <AuditLogPanel ctx={ctx} />}
    </div>
  );
}
