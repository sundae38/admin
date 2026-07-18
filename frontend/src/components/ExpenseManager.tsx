import { FormEvent, useEffect, useState } from "react";
import api from "../api/client";
import type { Payment } from "../api/types";
import type { DMContext } from "../pages/DataManagement";
import { groupProjectsByType, wonFull } from "../format";
import AuditCell from "./AuditCell";

// 장학금(지원금) 외 집행 — 심사관리비 / 프로그램운영비
const CATEGORIES = ["심사관리비", "프로그램운영비"];

function empty(projectId: number): Partial<Payment> {
  return {
    project_id: projectId,
    budget_category: "심사관리비",
    grant_kind: "최초지급",
    payment_type: "",
    planned_amount: 0,
    paid_amount: 0,
    paid_date: "",
    status: "지급완료",
    reason: "",
  };
}

export default function ExpenseManager({ ctx }: { ctx: DMContext }) {
  const { projects } = ctx;
  const [projectId, setProjectId] = useState<number | "">("");
  const [rows, setRows] = useState<Payment[]>([]);
  const [editing, setEditing] = useState<Partial<Payment> | null>(null);

  useEffect(() => {
    if (projectId === "" && projects.length) setProjectId(projects[0].id);
  }, [projects]);

  function load() {
    if (projectId === "") return;
    api.get<Payment[]>("/api/payments", { params: { project_id: projectId } })
      .then((r) => setRows(r.data.filter((p) => CATEGORIES.includes(p.budget_category))));
  }
  useEffect(load, [projectId]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      ...editing,
      planned_amount: Number(editing.planned_amount ?? 0),
      paid_amount: Number(editing.paid_amount ?? 0),
      paid_date: editing.paid_date || null,
    };
    if (editing.id) await api.put(`/api/payments/${editing.id}`, payload);
    else await api.post("/api/payments", payload);
    setEditing(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm("이 지급 내역을 삭제할까요?")) return;
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
        <button className="btn primary" disabled={projectId === ""} onClick={() => setEditing(empty(Number(projectId)))}>+ 기타 지급 등록</button>
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: -6 }}>심사관리비·프로그램운영비 등 장학금(지원금) 외 집행 내역을 관리합니다.</p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>예산항목</th><th>지급유형</th><th className="num">계획금액</th><th className="num">집행액</th><th>일자</th><th>상태</th><th>작성/수정 (감사)</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.budget_category}</td>
                <td>{p.payment_type || "-"}</td>
                <td className="num">{wonFull(p.planned_amount)}</td>
                <td className="num">{wonFull(p.paid_amount)}</td>
                <td>{p.paid_date || "-"}</td>
                <td>{p.status}</td>
                <td><AuditCell audit={p} /></td>
                <td className="num">
                  <button className="btn small" onClick={() => setEditing(p)}>수정</button>{" "}
                  <button className="btn small danger" onClick={() => remove(p.id)}>삭제</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="empty">등록된 기타 지급 내역이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h3>{editing.id ? "기타 지급 수정" : "기타 지급 등록"}</h3>
            <div className="form-grid">
              <div><label className="field">예산항목 *</label>
                <select value={editing.budget_category ?? "심사관리비"} onChange={(e) => set("budget_category", e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="field">지급유형</label><input value={editing.payment_type ?? ""} onChange={(e) => set("payment_type", e.target.value)} placeholder="예: 심사위원 수당" /></div>
              <div><label className="field">계획금액 (원)</label><input type="number" value={editing.planned_amount ?? 0} onChange={(e) => set("planned_amount", Number(e.target.value))} /></div>
              <div><label className="field">집행액 (원)</label><input type="number" value={editing.paid_amount ?? 0} onChange={(e) => set("paid_amount", Number(e.target.value))} /></div>
              <div><label className="field">일자</label><input type="date" value={editing.paid_date ?? ""} onChange={(e) => set("paid_date", e.target.value)} /></div>
              <div><label className="field">상태</label>
                <select value={editing.status ?? "지급완료"} onChange={(e) => set("status", e.target.value)}>
                  <option>예정</option><option>지급완료</option><option>보류</option>
                </select>
              </div>
              <div className="full"><label className="field">사유/비고</label><input value={editing.reason ?? ""} onChange={(e) => set("reason", e.target.value)} /></div>
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
