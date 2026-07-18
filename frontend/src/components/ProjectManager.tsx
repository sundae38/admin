import { FormEvent, useState } from "react";
import api from "../api/client";
import type { Project } from "../api/types";
import type { DMContext } from "../pages/DataManagement";
import { num, wonFull } from "../format";
import AuditCell from "./AuditCell";

const EMPTY: Partial<Project> = {
  name: "",
  project_type: "",
  year: new Date().getFullYear(),
  status: "진행중",
  total_budget: 0,
  budget_grant: 0,
  budget_review: 0,
  budget_program: 0,
  fund_contribution: 0,
  fund_investment: 0,
  fund_carryover: 0,
  fund_donation: 0,
  fund_agency: 0,
  target_headcount: 0,
  applicant_count: 0,
  manager: "",
};

const GRANT_TYPE_PRESETS = ["학업장려금", "연구지원금", "활동장려금", "등록금"];

const BUDGET_FIELDS: [keyof Project, string][] = [
  ["total_budget", "총예산"],
  ["budget_grant", "장학금(지원금)"],
  ["budget_review", "심사관리비"],
  ["budget_program", "프로그램운영비"],
];
const FUND_FIELDS: [keyof Project, string][] = [
  ["fund_contribution", "출연금"],
  ["fund_investment", "운용소득"],
  ["fund_carryover", "전기이월금"],
  ["fund_donation", "기부금"],
  ["fund_agency", "대행사업비"],
];

export default function ProjectManager({ ctx }: { ctx: DMContext }) {
  const { projects, meta, reloadProjects } = ctx;
  const [editing, setEditing] = useState<Partial<Project> | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const numFields = [
      "year", "total_budget", "budget_grant", "budget_review", "budget_program",
      "fund_contribution", "fund_investment", "fund_carryover", "fund_donation",
      "fund_agency", "target_headcount", "applicant_count",
    ];
    const payload: Record<string, unknown> = { ...editing };
    numFields.forEach((f) => (payload[f] = Number((editing as Record<string, unknown>)[f] ?? 0)));
    if (editing.id) await api.put(`/api/projects/${editing.id}`, payload);
    else await api.post("/api/projects", payload);
    setEditing(null);
    reloadProjects();
  }

  async function remove(id: number) {
    if (!confirm("이 프로젝트와 관련된 모든 데이터가 삭제됩니다. 계속할까요?")) return;
    await api.delete(`/api/projects/${id}`);
    reloadProjects();
  }

  const set = (k: keyof Project, v: unknown) => setEditing({ ...editing, [k]: v });

  return (
    <div>
      <div className="toolbar">
        <span className="muted">총 {projects.length}개 프로젝트</span>
        <button className="btn primary" onClick={() => setEditing({ ...EMPTY })}>+ 프로젝트 등록</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>프로젝트명</th><th>유형</th><th>연도</th><th>상태</th>
              <th className="num">총예산</th><th className="num">장학금(지원금)</th>
              <th className="num">목표선발</th><th>작성/수정 (감사)</th><th></th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>{p.project_type}</td>
                <td>{p.year}</td>
                <td><span className={`badge ${p.status}`}>{p.status}</span></td>
                <td className="num">{wonFull(p.total_budget)}</td>
                <td className="num">{wonFull(p.budget_grant)}</td>
                <td className="num">{num(p.target_headcount)}</td>
                <td><AuditCell audit={p} /></td>
                <td className="num">
                  <button className="btn small" onClick={() => setEditing(p)}>수정</button>{" "}
                  <button className="btn small danger" onClick={() => remove(p.id)}>삭제</button>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr><td colSpan={9} className="empty">등록된 프로젝트가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <form className="modal" style={{ width: 620 }} onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h3>{editing.id ? "프로젝트 수정" : "프로젝트 등록"}</h3>
            <div className="form-grid">
              <div className="full">
                <label className="field">프로젝트명 *</label>
                <input required value={editing.name ?? ""} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <label className="field">상위 유형 *</label>
                <input
                  required
                  list="ptype-list"
                  placeholder="예: 장학사업"
                  value={editing.project_type ?? ""}
                  onChange={(e) => set("project_type", e.target.value)}
                />
                <datalist id="ptype-list">
                  {(meta?.project_types || []).map((t) => <option key={t} value={t} />)}
                </datalist>
              </div>
              <div>
                <label className="field">연도 *</label>
                <input type="number" required value={editing.year ?? ""} onChange={(e) => set("year", Number(e.target.value))} />
              </div>
              <div>
                <label className="field">상태</label>
                <select value={editing.status ?? "진행중"} onChange={(e) => set("status", e.target.value)}>
                  <option>예정</option><option>진행중</option><option>완료</option>
                </select>
              </div>
              <div>
                <label className="field">구분 (장학금 종류)</label>
                <select
                  value={GRANT_TYPE_PRESETS.includes(editing.grant_type ?? "") ? editing.grant_type ?? "" : (editing.grant_type ? "기타" : "")}
                  onChange={(e) => set("grant_type", e.target.value === "기타" ? "기타" : e.target.value)}
                >
                  <option value="">선택 안 함</option>
                  {GRANT_TYPE_PRESETS.map((t) => <option key={t}>{t}</option>)}
                  <option value="기타">기타(직접 입력)</option>
                </select>
              </div>
              {editing.grant_type && !GRANT_TYPE_PRESETS.includes(editing.grant_type) && (
                <div>
                  <label className="field">기타 구분명</label>
                  <input
                    placeholder="예: 국외연수 장학금"
                    value={editing.grant_type === "기타" ? "" : editing.grant_type}
                    onChange={(e) => set("grant_type", e.target.value || "기타")}
                  />
                </div>
              )}
              <div>
                <label className="field">담당자</label>
                <input value={editing.manager ?? ""} onChange={(e) => set("manager", e.target.value)} />
              </div>
              <div>
                <label className="field">목표 선발인원</label>
                <input type="number" value={editing.target_headcount ?? 0} onChange={(e) => set("target_headcount", Number(e.target.value))} />
              </div>
              <div>
                <label className="field">지원자 수</label>
                <input type="number" value={editing.applicant_count ?? 0} onChange={(e) => set("applicant_count", Number(e.target.value))} />
              </div>
            </div>

            <SectionTitle>예산 (용도별)</SectionTitle>
            <div className="form-grid">
              {BUDGET_FIELDS.map(([k, label]) => (
                <div key={k}>
                  <label className="field">{label} (원)</label>
                  <input type="number" value={(editing as Record<string, number>)[k] ?? 0} onChange={(e) => set(k, Number(e.target.value))} />
                </div>
              ))}
            </div>

            <SectionTitle>예산 (재원별)</SectionTitle>
            <div className="form-grid">
              {FUND_FIELDS.map(([k, label]) => (
                <div key={k}>
                  <label className="field">{label} (원)</label>
                  <input type="number" value={(editing as Record<string, number>)[k] ?? 0} onChange={(e) => set(k, Number(e.target.value))} />
                </div>
              ))}
            </div>

            <div className="row" style={{ justifyContent: "flex-end", marginTop: 20 }}>
              <button type="button" className="btn" onClick={() => setEditing(null)}>취소</button>
              <button className="btn primary">저장</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ margin: "18px 0 4px", fontWeight: 600, fontSize: 13.5, color: "var(--text-secondary)", borderTop: "1px solid var(--grid)", paddingTop: 14 }}>
      {children}
    </div>
  );
}
