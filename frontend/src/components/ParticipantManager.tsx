import { FormEvent, useEffect, useState } from "react";
import api from "../api/client";
import type { Participant } from "../api/types";
import type { DMContext } from "../pages/DataManagement";
import AuditCell from "./AuditCell";

const GENDERS = ["남", "여", "기타"];

function empty(projectId: number): Partial<Participant> {
  return {
    project_id: projectId,
    name: "",
    gender: "남",
    school_level: "",
    region: "",
    category: "",
    special_categories: [],
    selected_date: "",
    status: "선발",
  };
}

export default function ParticipantManager({ ctx }: { ctx: DMContext }) {
  const { projects, meta } = ctx;
  const [projectId, setProjectId] = useState<number | "">("");
  const [rows, setRows] = useState<Participant[]>([]);
  const [editing, setEditing] = useState<Partial<Participant> | null>(null);

  useEffect(() => {
    if (projectId === "" && projects.length) setProjectId(projects[0].id);
  }, [projects]);

  function load() {
    if (projectId === "") return;
    api.get<Participant[]>("/api/participants", { params: { project_id: projectId } }).then((r) => setRows(r.data));
  }
  useEffect(load, [projectId]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload = { ...editing, selected_date: editing.selected_date || null };
    if (editing.id) await api.put(`/api/participants/${editing.id}`, payload);
    else await api.post("/api/participants", payload);
    setEditing(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm("이 선발자를 삭제할까요?")) return;
    await api.delete(`/api/participants/${id}`);
    load();
  }

  const set = (k: keyof Participant, v: unknown) => setEditing({ ...editing, [k]: v });

  function toggleCategory(cat: string) {
    if (!editing) return;
    const cur = editing.special_categories || [];
    const next = cur.includes(cat) ? cur.filter((c) => c !== cat) : [...cur, cat];
    setEditing({ ...editing, special_categories: next });
  }

  const careCats = meta?.special_care_categories || [];
  const schoolLevels = meta?.school_levels || [];

  return (
    <div>
      <div className="toolbar">
        <div className="row">
          <label className="field" style={{ margin: 0 }}>프로젝트</label>
          <select value={projectId} onChange={(e) => setProjectId(Number(e.target.value))} style={{ width: 280 }}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.year} · {p.name}</option>)}
          </select>
          <span className="muted">선발 {rows.length}명</span>
        </div>
        <button className="btn primary" disabled={projectId === ""} onClick={() => setEditing(empty(Number(projectId)))}>
          + 선발자 등록
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>이름</th><th>성별</th><th>학교급</th><th>지역</th><th>교육약자</th><th>상태</th><th>작성/수정 (감사)</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>{p.gender || "-"}</td>
                <td>{p.school_level || "-"}</td>
                <td>{p.region || "-"}</td>
                <td>{(p.special_categories || []).join(", ") || "-"}</td>
                <td>{p.status}</td>
                <td><AuditCell audit={p} /></td>
                <td className="num">
                  <button className="btn small" onClick={() => setEditing(p)}>수정</button>{" "}
                  <button className="btn small danger" onClick={() => remove(p.id)}>삭제</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="empty">등록된 선발자가 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <form className="modal" style={{ width: 560 }} onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h3>{editing.id ? "선발자 수정" : "선발자 등록"}</h3>
            <div className="form-grid">
              <div><label className="field">이름 *</label><input required value={editing.name ?? ""} onChange={(e) => set("name", e.target.value)} autoFocus /></div>
              <div><label className="field">성별</label>
                <select value={editing.gender ?? "남"} onChange={(e) => set("gender", e.target.value)}>{GENDERS.map((g) => <option key={g}>{g}</option>)}</select>
              </div>
              <div><label className="field">학교급</label>
                <select value={editing.school_level ?? ""} onChange={(e) => set("school_level", e.target.value)}>
                  <option value="">선택</option>
                  {schoolLevels.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="field">지역</label><input value={editing.region ?? ""} onChange={(e) => set("region", e.target.value)} /></div>
              <div><label className="field">소속/유형</label><input value={editing.category ?? ""} onChange={(e) => set("category", e.target.value)} /></div>
              <div><label className="field">선발일</label><input type="date" value={editing.selected_date ?? ""} onChange={(e) => set("selected_date", e.target.value)} /></div>
              <div><label className="field">상태</label>
                <select value={editing.status ?? "선발"} onChange={(e) => set("status", e.target.value)}>
                  <option>선발</option><option>수료</option><option>중도포기</option>
                </select>
              </div>
            </div>

            <div style={{ margin: "18px 0 8px", fontWeight: 600, fontSize: 13.5, color: "var(--text-secondary)", borderTop: "1px solid var(--grid)", paddingTop: 14 }}>
              교육약자 구분 (해당 항목 모두 선택)
            </div>
            {careCats.length === 0 ? (
              <div className="muted" style={{ fontSize: 13 }}>
                등록된 교육약자 항목이 없습니다. 관리자에게 [사용자 관리 → 교육약자 구분]에서 항목 추가를 요청하세요.
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {careCats.map((cat) => {
                  const on = (editing.special_categories || []).includes(cat);
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className="btn small"
                      style={on ? { background: "var(--brand)", color: "#fff", borderColor: "var(--brand)" } : undefined}
                    >
                      {on ? "✓ " : ""}{cat}
                    </button>
                  );
                })}
              </div>
            )}

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
