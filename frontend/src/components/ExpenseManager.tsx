import { FormEvent, useEffect, useState } from "react";
import api from "../api/client";
import type { Payment } from "../api/types";
import type { DMContext } from "../pages/DataManagement";
import { groupProjectsByType, pct, won, wonFull } from "../format";

// 장학금(지원금) 외 예산 — 심사관리비 / 사업관리비. 각 하위에서 예산과목(예산/집행액) 입력.
const CATEGORIES = ["심사관리비", "사업관리비"];

function empty(projectId: number, category: string): Partial<Payment> {
  return {
    project_id: projectId,
    budget_category: category,
    grant_kind: "최초지급",
    payment_type: "",
    planned_amount: 0,
    paid_amount: 0,
    status: "지급완료",
    reason: "",
  };
}

export default function ExpenseManager({ ctx }: { ctx: DMContext }) {
  const { projects } = ctx;
  const [projectId, setProjectId] = useState<number | "">("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [all, setAll] = useState<Payment[]>([]);
  const [editing, setEditing] = useState<Partial<Payment> | null>(null);

  useEffect(() => {
    if (projectId === "" && projects.length) setProjectId(projects[0].id);
  }, [projects]);

  function load() {
    if (projectId === "") return;
    api.get<Payment[]>("/api/payments", { params: { project_id: projectId } })
      .then((r) => setAll(r.data.filter((p) => CATEGORIES.includes(p.budget_category))));
  }
  useEffect(load, [projectId]);

  const rows = all.filter((p) => p.budget_category === category);
  const totalPlanned = rows.reduce((s, p) => s + (p.planned_amount || 0), 0);
  const totalPaid = rows.reduce((s, p) => s + (p.paid_amount || 0), 0);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      ...editing,
      planned_amount: Number(editing.planned_amount ?? 0),
      paid_amount: Number(editing.paid_amount ?? 0),
    };
    if (editing.id) await api.put(`/api/payments/${editing.id}`, payload);
    else await api.post("/api/payments", payload);
    setEditing(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm("이 예산과목을 삭제할까요?")) return;
    await api.delete(`/api/payments/${id}`);
    load();
  }

  const set = (k: keyof Payment, v: unknown) => setEditing({ ...editing, [k]: v });

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
        <button className="btn primary" disabled={projectId === ""} onClick={() => setEditing(empty(Number(projectId), category))}>+ 예산과목 등록</button>
      </div>

      {/* 심사관리비 / 사업관리비 하위 메뉴 */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {CATEGORIES.map((c) => (
          <div key={c} className={`tab ${category === c ? "active" : ""}`} onClick={() => setCategory(c)}>{c}</div>
        ))}
      </div>

      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <div className="kpi-tile"><div className="label">{category} 총예산</div><div className="value" style={{ fontSize: 20 }}>{wonFull(totalPlanned)}</div></div>
        <div className="kpi-tile"><div className="label">집행액</div><div className="value" style={{ fontSize: 20 }}>{wonFull(totalPaid)}</div></div>
        <div className="kpi-tile" style={{ borderColor: "var(--brand)", borderWidth: 2 }}><div className="label">집행률</div><div className="value">{pct(totalPlanned ? (totalPaid / totalPlanned) * 100 : 0)}</div></div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>예산과목</th><th className="num">예산</th><th className="num">집행액</th><th className="num">집행률</th><th>상태</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.payment_type || "-"}</td>
                <td className="num">{won(p.planned_amount)}</td>
                <td className="num">{won(p.paid_amount)}</td>
                <td className="num">{p.planned_amount ? pct((p.paid_amount / p.planned_amount) * 100) : "-"}</td>
                <td>{p.status}</td>
                <td className="num">
                  <button className="btn small" onClick={() => setEditing(p)}>수정</button>{" "}
                  <button className="btn small danger" onClick={() => remove(p.id)}>삭제</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="empty">등록된 {category} 예산과목이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h3>{editing.id ? "예산과목 수정" : `${editing.budget_category} 예산과목 등록`}</h3>
            <div className="form-grid">
              <div><label className="field">예산과목 분류</label>
                <select value={editing.budget_category ?? category} onChange={(e) => set("budget_category", e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="field">예산과목명 *</label><input required value={editing.payment_type ?? ""} onChange={(e) => set("payment_type", e.target.value)} placeholder="예: 심사위원 수당, 회의비" autoFocus /></div>
              <div><label className="field">예산 (원)</label><input type="number" value={editing.planned_amount ?? 0} onChange={(e) => set("planned_amount", Number(e.target.value))} /></div>
              <div><label className="field">집행액 (원)</label><input type="number" value={editing.paid_amount ?? 0} onChange={(e) => set("paid_amount", Number(e.target.value))} /></div>
              <div><label className="field">상태</label>
                <select value={editing.status ?? "지급완료"} onChange={(e) => set("status", e.target.value)}>
                  <option>예정</option><option>집행중</option><option>지급완료</option><option>보류</option>
                </select>
              </div>
              <div className="full"><label className="field">비고</label><input value={editing.reason ?? ""} onChange={(e) => set("reason", e.target.value)} /></div>
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
