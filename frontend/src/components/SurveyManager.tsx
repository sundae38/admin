import { FormEvent, useEffect, useState } from "react";
import api from "../api/client";
import type { Survey } from "../api/types";
import type { DMContext } from "../pages/DataManagement";
import AuditCell from "./AuditCell";

interface Item { key: string; score: string }

interface EditState {
  id?: number;
  project_id: number;
  survey_type: string;
  title: string;
  respondent_count: number;
  conducted_date: string;
  avg_score: number;
  items: Item[];
}

function empty(projectId: number): EditState {
  return {
    project_id: projectId,
    survey_type: "전체",
    title: "",
    respondent_count: 0,
    conducted_date: "",
    avg_score: 0,
    items: [{ key: "", score: "" }],
  };
}

function fromSurvey(s: Survey): EditState {
  return {
    id: s.id,
    project_id: s.project_id,
    survey_type: s.survey_type,
    title: s.title ?? "",
    respondent_count: s.respondent_count,
    conducted_date: s.conducted_date ?? "",
    avg_score: s.avg_score,
    items: s.item_scores
      ? Object.entries(s.item_scores).map(([k, v]) => ({ key: k, score: String(v) }))
      : [{ key: "", score: "" }],
  };
}

export default function SurveyManager({ ctx }: { ctx: DMContext }) {
  const { projects } = ctx;
  const [projectId, setProjectId] = useState<number | "">("");
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [editing, setEditing] = useState<EditState | null>(null);

  useEffect(() => {
    if (projectId === "" && projects.length) setProjectId(projects[0].id);
  }, [projects]);

  function load() {
    if (projectId === "") return;
    api.get<Survey[]>("/api/surveys", { params: { project_id: projectId } }).then((r) => setSurveys(r.data));
  }
  useEffect(load, [projectId]);

  function computedAvg(items: Item[]): number {
    const nums = items.map((i) => Number(i.score)).filter((n) => !isNaN(n) && n > 0);
    return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100 : 0;
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const item_scores: Record<string, number> = {};
    editing.items.forEach((i) => {
      if (i.key.trim() && i.score !== "") item_scores[i.key.trim()] = Number(i.score);
    });
    const hasItems = Object.keys(item_scores).length > 0;
    const payload = {
      project_id: editing.project_id,
      survey_type: editing.survey_type,
      title: editing.title,
      respondent_count: Number(editing.respondent_count),
      conducted_date: editing.conducted_date || null,
      avg_score: hasItems ? computedAvg(editing.items) : Number(editing.avg_score),
      item_scores: hasItems ? item_scores : null,
    };
    if (editing.id) await api.put(`/api/surveys/${editing.id}`, payload);
    else await api.post("/api/surveys", payload);
    setEditing(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm("이 설문을 삭제할까요?")) return;
    await api.delete(`/api/surveys/${id}`);
    load();
  }

  function updateItem(idx: number, field: keyof Item, value: string) {
    if (!editing) return;
    const items = editing.items.map((it, i) => (i === idx ? { ...it, [field]: value } : it));
    setEditing({ ...editing, items });
  }

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
          + 만족도 설문 등록
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>설문</th><th>유형</th><th className="num">응답수</th><th className="num">평균</th><th>항목별 점수</th><th>실시일</th><th>작성/수정 (감사)</th><th></th></tr>
          </thead>
          <tbody>
            {surveys.map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.title}</td>
                <td>{s.survey_type}</td>
                <td className="num">{s.respondent_count}</td>
                <td className="num">{s.avg_score.toFixed(2)}</td>
                <td>{s.item_scores ? Object.entries(s.item_scores).map(([k, v]) => `${k} ${v}`).join(", ") : "-"}</td>
                <td>{s.conducted_date ?? "-"}</td>
                <td><AuditCell audit={s} /></td>
                <td className="num">
                  <button className="btn small" onClick={() => setEditing(fromSurvey(s))}>수정</button>{" "}
                  <button className="btn small danger" onClick={() => remove(s.id)}>삭제</button>
                </td>
              </tr>
            ))}
            {surveys.length === 0 && <tr><td colSpan={8} className="empty">등록된 설문이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h3>{editing.id ? "만족도 설문 수정" : "만족도 설문 등록"}</h3>
            <div className="form-grid">
              <div>
                <label className="field">설문 유형</label>
                <select value={editing.survey_type} onChange={(e) => setEditing({ ...editing, survey_type: e.target.value })}>
                  <option value="전체">전체 만족도</option>
                  <option value="프로그램">프로그램 만족도</option>
                </select>
              </div>
              <div>
                <label className="field">응답 수</label>
                <input type="number" value={editing.respondent_count} onChange={(e) => setEditing({ ...editing, respondent_count: Number(e.target.value) })} />
              </div>
              <div className="full">
                <label className="field">설문 제목</label>
                <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <label className="field">실시일</label>
                <input type="date" value={editing.conducted_date} onChange={(e) => setEditing({ ...editing, conducted_date: e.target.value })} />
              </div>
              <div>
                <label className="field">평균 점수 (항목 입력 시 자동계산)</label>
                <input type="number" step="0.01" value={editing.avg_score} onChange={(e) => setEditing({ ...editing, avg_score: Number(e.target.value) })} />
              </div>
            </div>

            <div style={{ margin: "18px 0 8px", fontWeight: 600, fontSize: 13.5, color: "var(--text-secondary)", borderTop: "1px solid var(--grid)", paddingTop: 14 }}>
              항목별 점수 (5점 척도)
            </div>
            {editing.items.map((it, idx) => (
              <div className="row" key={idx} style={{ marginBottom: 8 }}>
                <input
                  placeholder="항목명 (예: 강사 만족도)"
                  value={it.key}
                  onChange={(e) => updateItem(idx, "key", e.target.value)}
                  style={{ flex: 2 }}
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="점수"
                  value={it.score}
                  onChange={(e) => updateItem(idx, "score", e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn small danger" onClick={() => setEditing({ ...editing, items: editing.items.filter((_, i) => i !== idx) })}>
                  −
                </button>
              </div>
            ))}
            <button type="button" className="btn small" onClick={() => setEditing({ ...editing, items: [...editing.items, { key: "", score: "" }] })}>
              + 항목 추가
            </button>

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
