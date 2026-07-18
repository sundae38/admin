import { FormEvent, useEffect, useState } from "react";
import api from "../api/client";
import type { Partner } from "../api/types";
import type { DMContext } from "../pages/DataManagement";
import AuditCell from "./AuditCell";

const PARTNER_TYPES = ["대학", "기업", "공공기관", "협회", "재단", "기타"];

function empty(projectId: number): Partial<Partner> {
  return {
    project_id: projectId,
    name: "",
    partner_type: "대학",
    contribution: "",
    contact: "",
    agreement_start: "",
    agreement_end: "",
    status: "협약중",
  };
}

export default function PartnerManager({ ctx }: { ctx: DMContext }) {
  const { projects } = ctx;
  const [projectId, setProjectId] = useState<number | "">("");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [editing, setEditing] = useState<Partial<Partner> | null>(null);

  useEffect(() => {
    if (projectId === "" && projects.length) setProjectId(projects[0].id);
  }, [projects]);

  function load() {
    if (projectId === "") return;
    api.get<Partner[]>("/api/partners", { params: { project_id: projectId } }).then((r) => setPartners(r.data));
  }
  useEffect(load, [projectId]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      ...editing,
      agreement_start: editing.agreement_start || null,
      agreement_end: editing.agreement_end || null,
    };
    if (editing.id) await api.put(`/api/partners/${editing.id}`, payload);
    else await api.post("/api/partners", payload);
    setEditing(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm("이 협력기관을 삭제할까요?")) return;
    await api.delete(`/api/partners/${id}`);
    load();
  }

  const set = (k: keyof Partner, v: unknown) => setEditing({ ...editing, [k]: v });

  return (
    <div>
      <div className="toolbar">
        <div className="row">
          <label className="field" style={{ margin: 0 }}>프로젝트</label>
          <select value={projectId} onChange={(e) => setProjectId(Number(e.target.value))} style={{ width: 280 }}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.year} · {p.name}</option>)}
          </select>
        </div>
        <button className="btn primary" disabled={projectId === ""} onClick={() => setEditing(empty(Number(projectId)))}>
          + 협력기관 등록
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>기관명</th><th>유형</th><th>협력내용</th><th>담당자</th><th>협약기간</th><th>상태</th><th>작성/수정 (감사)</th><th></th></tr>
          </thead>
          <tbody>
            {partners.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>{p.partner_type}</td>
                <td>{p.contribution}</td>
                <td>{p.contact}</td>
                <td>{p.agreement_start && p.agreement_end ? `${p.agreement_start} ~ ${p.agreement_end}` : "-"}</td>
                <td>{p.status}</td>
                <td><AuditCell audit={p} /></td>
                <td className="num">
                  <button className="btn small" onClick={() => setEditing(p)}>수정</button>{" "}
                  <button className="btn small danger" onClick={() => remove(p.id)}>삭제</button>
                </td>
              </tr>
            ))}
            {partners.length === 0 && <tr><td colSpan={8} className="empty">등록된 협력기관이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h3>{editing.id ? "협력기관 수정" : "협력기관 등록"}</h3>
            <div className="form-grid">
              <div className="full">
                <label className="field">기관명 *</label>
                <input required value={editing.name ?? ""} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <label className="field">유형</label>
                <select value={editing.partner_type ?? "대학"} onChange={(e) => set("partner_type", e.target.value)}>
                  {PARTNER_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="field">담당자</label>
                <input value={editing.contact ?? ""} onChange={(e) => set("contact", e.target.value)} />
              </div>
              <div>
                <label className="field">협약 시작일</label>
                <input type="date" value={editing.agreement_start ?? ""} onChange={(e) => set("agreement_start", e.target.value)} />
              </div>
              <div>
                <label className="field">협약 종료일</label>
                <input type="date" value={editing.agreement_end ?? ""} onChange={(e) => set("agreement_end", e.target.value)} />
              </div>
              <div>
                <label className="field">상태</label>
                <select value={editing.status ?? "협약중"} onChange={(e) => set("status", e.target.value)}>
                  <option>예정</option><option>협약중</option><option>종료</option>
                </select>
              </div>
              <div className="full">
                <label className="field">협력내용</label>
                <textarea rows={2} value={editing.contribution ?? ""} onChange={(e) => set("contribution", e.target.value)} />
              </div>
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
