import { FormEvent, useEffect, useState } from "react";
import api from "../api/client";
import type { GrowthMetric } from "../api/types";
import type { DMContext } from "../pages/DataManagement";
import { groupProjectsByType, pct } from "../format";
import AuditCell from "./AuditCell";

function empty(projectId: number): Partial<GrowthMetric> {
  return { project_id: projectId, metric_name: "", target_value: 0, actual_value: 0, measured_date: "" };
}

export default function GrowthMetricManager({ ctx }: { ctx: DMContext }) {
  const { projects } = ctx;
  const [projectId, setProjectId] = useState<number | "">("");
  const [rows, setRows] = useState<GrowthMetric[]>([]);
  const [editing, setEditing] = useState<Partial<GrowthMetric> | null>(null);

  useEffect(() => {
    if (projectId === "" && projects.length) setProjectId(projects[0].id);
  }, [projects]);

  function load() {
    if (projectId === "") return;
    api.get<GrowthMetric[]>("/api/growth-metrics", { params: { project_id: projectId } }).then((r) => setRows(r.data));
  }
  useEffect(load, [projectId]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      ...editing,
      target_value: Number(editing.target_value ?? 0),
      actual_value: Number(editing.actual_value ?? 0),
      measured_date: editing.measured_date || null,
    };
    if (editing.id) await api.put(`/api/growth-metrics/${editing.id}`, payload);
    else await api.post("/api/growth-metrics", payload);
    setEditing(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm("이 성과 지표를 삭제할까요?")) return;
    await api.delete(`/api/growth-metrics/${id}`);
    load();
  }

  const set = (k: keyof GrowthMetric, v: unknown) => setEditing({ ...editing, [k]: v });

  return (
    <div>
      <div className="toolbar">
        <div className="row">
          <label className="field" style={{ margin: 0 }}>상위 유형 · 프로젝트</label>
          <select value={projectId} onChange={(e) => setProjectId(Number(e.target.value))} style={{ width: 340 }}>
            {groupProjectsByType(projects).map(([type, ps]) => (
              <optgroup key={type} label={type}>
                {ps.map((p) => <option key={p.id} value={p.id}>{p.year} · {p.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <button className="btn primary" disabled={projectId === ""} onClick={() => setEditing(empty(Number(projectId)))}>+ 성과 지표 등록</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>지표명</th><th className="num">목표값</th><th className="num">실적값</th><th className="num">달성률</th><th>측정일</th><th>작성/수정 (감사)</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.id}>
                <td style={{ fontWeight: 600 }}>{g.metric_name}</td>
                <td className="num">{g.target_value.toFixed(1)}</td>
                <td className="num">{g.actual_value.toFixed(1)}</td>
                <td className="num">{g.target_value ? pct((g.actual_value / g.target_value) * 100) : "-"}</td>
                <td>{g.measured_date || "-"}</td>
                <td><AuditCell audit={g} /></td>
                <td className="num">
                  <button className="btn small" onClick={() => setEditing(g)}>수정</button>{" "}
                  <button className="btn small danger" onClick={() => remove(g.id)}>삭제</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="empty">등록된 성과 지표가 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h3>{editing.id ? "성과 지표 수정" : "성과 지표 등록"}</h3>
            <div className="form-grid">
              <div className="full"><label className="field">지표명 *</label><input required value={editing.metric_name ?? ""} onChange={(e) => set("metric_name", e.target.value)} autoFocus placeholder="예: 역량평가 점수" /></div>
              <div><label className="field">목표값</label><input type="number" value={editing.target_value ?? 0} onChange={(e) => set("target_value", Number(e.target.value))} /></div>
              <div><label className="field">실적값</label><input type="number" value={editing.actual_value ?? 0} onChange={(e) => set("actual_value", Number(e.target.value))} /></div>
              <div><label className="field">측정일</label><input type="date" value={editing.measured_date ?? ""} onChange={(e) => set("measured_date", e.target.value)} /></div>
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
