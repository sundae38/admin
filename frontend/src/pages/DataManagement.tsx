import { useEffect, useState } from "react";
import api from "../api/client";
import type { Meta, Project } from "../api/types";
import ProjectManager from "../components/ProjectManager";
import GrantManager from "../components/GrantManager";
import PartnerManager from "../components/PartnerManager";
import SurveyManager from "../components/SurveyManager";
import ImportPanel from "../components/ImportPanel";
import AuditLogPanel from "../components/AuditLogPanel";

export type DMContext = { projects: Project[]; meta: Meta | null; reloadProjects: () => void };

export default function DataManagement() {
  const [tab, setTab] = useState<"projects" | "grants" | "partners" | "surveys" | "import" | "audit">("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);

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
      <p className="page-sub">프로젝트·협력기관·만족도를 직접 등록·수정하거나, 엑셀/CSV로 통합 업로드합니다.</p>
      <div className="tabs">
        <div className={`tab ${tab === "projects" ? "active" : ""}`} onClick={() => setTab("projects")}>프로젝트 관리</div>
        <div className={`tab ${tab === "grants" ? "active" : ""}`} onClick={() => setTab("grants")}>지원금 내역</div>
        <div className={`tab ${tab === "partners" ? "active" : ""}`} onClick={() => setTab("partners")}>협력기관 관리</div>
        <div className={`tab ${tab === "surveys" ? "active" : ""}`} onClick={() => setTab("surveys")}>만족도 관리</div>
        <div className={`tab ${tab === "import" ? "active" : ""}`} onClick={() => setTab("import")}>엑셀·CSV 가져오기</div>
        <div className={`tab ${tab === "audit" ? "active" : ""}`} onClick={() => setTab("audit")}>감사 이력</div>
      </div>
      {tab === "projects" && <ProjectManager ctx={ctx} />}
      {tab === "grants" && <GrantManager ctx={ctx} />}
      {tab === "partners" && <PartnerManager ctx={ctx} />}
      {tab === "surveys" && <SurveyManager ctx={ctx} />}
      {tab === "import" && <ImportPanel ctx={ctx} />}
      {tab === "audit" && <AuditLogPanel ctx={ctx} />}
    </div>
  );
}
