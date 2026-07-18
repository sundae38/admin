import { FormEvent, useEffect, useState } from "react";
import api from "../api/client";
import type { Program } from "../api/types";
import type { DMContext } from "../pages/DataManagement";
import { num } from "../format";
import AuditCell from "./AuditCell";

const TYPES = ["멘토링", "교육", "특강", "워크숍", "캠프", "기타"];

function empty(projectId: number): Partial<Program> {
  return { project_id: projectId, name: "", program_type: "교육", session_no: 1, start_date: "", end_date: "", target_count: 0 };
}

export default function ProgramManager({ ctx }: { ctx: DMContext }) {
  const { projects } = ctx;
  const [projectId, setProjectId] = useState<number | "">("");
  const [rows, setRows] = useState<Program[]>([]);
  const [editing, setEditing] = useState<Partial<Program> | null>(null);

  useEffect(() => {
    if (projectId === "" && projects.length) setProjectId(projects[0].id);
  }, [projects]);

  function load() {
    if (projectId === "") return;
    api.get<Program[]>("/api/programs", { params: { project_id: projectId } }).then((r) => setRows(r.data));
  }
  useEffect(load, [projectId]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      ...editing,
      session_no: editing.session_no ? Number(editing.session_no) : null,
      target_count: Number(editing.target_count ?? 0),
      start_date: editing.start_date || null,
      end_date: editing.end_date || null,
    };
    if (editing.id) await api.put(`/api/programs/${editing.id}`, payload);
    else await api.post("/api/programs", payload);
    setEditing(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm("이 세부 프로그램을 삭제할까요? (참여·설문 연결도 함께 정리됩니다)")) return;
    await api.delete(`/api/programs/${id}`);
    load();
  }

  const set = (k: keyof Program, v: unknown) => setEditing({ ...editing, [k]: v });

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
          + 세부 프로그램 등록
        </button>
      </div>

      <p className="muted" style={{ fontSize: 13, marginTop: -6 }}>
        같은 프로그램을 여러 번 운영하면 <b>회차</b>를 다르게 하여 각각 등록하세요. 만족도 설문은 회차(프로그램)별로 연결됩니다.
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>프로그램명</th><th>유형</th><th className="num">회차</th><th>기간</th><th className="num">대상</th><th className="num">참여</th><th>작성/수정 (감사)</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>{p.program_type || "-"}</td>
                <td className="num">{p.session_no ? `${p.session_no}회차` : "-"}</td>
                <td>{p.start_date ? `${p.start_date}${p.end_date ? ` ~ ${p.end_date}` : ""}` : "-"}</td>
                <td className="num">{num(p.target_count)}</td>
                <td className="num">{num(p.participation_count)}</td>
                <td><AuditCell audit={p} /></td>
                <td className="num">
                  <button className="btn small" onClick={() => setEditing(p)}>수정</button>{" "}
                  <button className="btn small danger" onClick={() => remove(p.id)}>삭제</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="empty">등록된 세부 프로그램이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h3>{editing.id ? "세부 프로그램 수정" : "세부 프로그램 등록"}</h3>
            <div className="form-grid">
              <div className="full"><label className="field">프로그램명 *</label><input required value={editing.name ?? ""} onChange={(e) => set("name", e.target.value)} autoFocus /></div>
              <div><label className="field">유형</label>
                <select value={editing.program_type ?? "교육"} onChange={(e) => set("program_type", e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              </div>
              <div><label className="field">회차</label><input type="number" min={1} value={editing.session_no ?? 1} onChange={(e) => set("session_no", Number(e.target.value))} /></div>
              <div><label className="field">시작일</label><input type="date" value={editing.start_date ?? ""} onChange={(e) => set("start_date", e.target.value)} /></div>
              <div><label className="field">종료일</label><input type="date" value={editing.end_date ?? ""} onChange={(e) => set("end_date", e.target.value)} /></div>
              <div><label className="field">대상 인원</label><input type="number" value={editing.target_count ?? 0} onChange={(e) => set("target_count", Number(e.target.value))} /></div>
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
