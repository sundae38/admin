import { FormEvent, useEffect, useState } from "react";
import api from "../api/client";
import type { Payment } from "../api/types";
import type { DMContext } from "../pages/DataManagement";
import { wonFull } from "../format";
import AuditCell from "./AuditCell";

const KINDS = ["최초지급", "추가지급", "반환"];

function empty(projectId: number): Partial<Payment> {
  return {
    project_id: projectId,
    budget_category: "지원금",
    grant_kind: "최초지급",
    initial_headcount: 0,
    paid_amount: 0,
    reason: "",
    paid_date: "",
    status: "지급완료",
  };
}

export default function GrantManager({ ctx }: { ctx: DMContext }) {
  const { projects } = ctx;
  const [projectId, setProjectId] = useState<number | "">("");
  const [rows, setRows] = useState<Payment[]>([]);
  const [editing, setEditing] = useState<Partial<Payment> | null>(null);

  useEffect(() => {
    if (projectId === "" && projects.length) setProjectId(projects[0].id);
  }, [projects]);

  function load() {
    if (projectId === "") return;
    api
      .get<Payment[]>("/api/payments", { params: { project_id: projectId } })
      .then((r) => setRows(r.data.filter((p) => p.budget_category === "지원금")));
  }
  useEffect(load, [projectId]);

  // 요약 (실집행 = 최초 + 추가 − 반환)
  const sum = (kind: string) => rows.filter((r) => r.grant_kind === kind).reduce((s, r) => s + r.paid_amount, 0);
  const initial = sum("최초지급");
  const additional = sum("추가지급");
  const returned = sum("반환");
  const executed = initial + additional - returned;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      ...editing,
      budget_category: "지원금",
      paid_amount: Number(editing.paid_amount ?? 0),
      initial_headcount: Number(editing.initial_headcount ?? 0),
      paid_date: editing.paid_date || null,
    };
    if (editing.id) await api.put(`/api/payments/${editing.id}`, payload);
    else await api.post("/api/payments", payload);
    setEditing(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm("이 지원금 내역을 삭제할까요?")) return;
    await api.delete(`/api/payments/${id}`);
    load();
  }

  const set = (k: keyof Payment, v: unknown) => setEditing({ ...editing, [k]: v });

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
          + 지원금 내역 등록
        </button>
      </div>

      <div className="kpi-grid">
        <SumTile label="최초지급" value={initial} />
        <SumTile label="추가지급" value={additional} />
        <SumTile label="반환" value={returned} />
        <SumTile label="실집행액 (최초+추가−반환)" value={executed} highlight />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>구분</th><th className="num">금액</th><th className="num">최초선발인원</th><th>사유</th><th>일자</th><th>상태</th><th>작성/수정 (감사)</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td><span className="badge" style={{ background: p.grant_kind === "반환" ? "#fbe4e4" : "#e2edfb", color: p.grant_kind === "반환" ? "#a12" : "#184f95" }}>{p.grant_kind}</span></td>
                <td className="num">{wonFull(p.paid_amount)}</td>
                <td className="num">{p.grant_kind === "최초지급" ? p.initial_headcount : "-"}</td>
                <td>{p.reason || "-"}</td>
                <td>{p.paid_date || "-"}</td>
                <td>{p.status}</td>
                <td><AuditCell audit={p} /></td>
                <td className="num">
                  <button className="btn small" onClick={() => setEditing(p)}>수정</button>{" "}
                  <button className="btn small danger" onClick={() => remove(p.id)}>삭제</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="empty">등록된 지원금 내역이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h3>{editing.id ? "지원금 내역 수정" : "지원금 내역 등록"}</h3>
            <div className="form-grid">
              <div>
                <label className="field">구분 *</label>
                <select value={editing.grant_kind ?? "최초지급"} onChange={(e) => set("grant_kind", e.target.value)}>
                  {KINDS.map((k) => <option key={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="field">금액 (원) *</label>
                <input type="number" required value={editing.paid_amount ?? 0} onChange={(e) => set("paid_amount", Number(e.target.value))} />
              </div>
              {editing.grant_kind === "최초지급" && (
                <div>
                  <label className="field">최초 선발인원</label>
                  <input type="number" value={editing.initial_headcount ?? 0} onChange={(e) => set("initial_headcount", Number(e.target.value))} />
                </div>
              )}
              <div>
                <label className="field">일자</label>
                <input type="date" value={editing.paid_date ?? ""} onChange={(e) => set("paid_date", e.target.value)} />
              </div>
              <div>
                <label className="field">상태</label>
                <select value={editing.status ?? "지급완료"} onChange={(e) => set("status", e.target.value)}>
                  <option>예정</option><option>지급완료</option><option>보류</option>
                </select>
              </div>
              <div className="full">
                <label className="field">사유</label>
                <input value={editing.reason ?? ""} onChange={(e) => set("reason", e.target.value)} placeholder="예: 우수활동 인센티브 / 중도포기 환수" />
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

function SumTile({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="kpi-tile" style={highlight ? { borderColor: "var(--brand)", borderWidth: 2 } : undefined}>
      <div className="label">{label}</div>
      <div className="value" style={{ fontSize: 20 }}>{wonFull(value)}</div>
    </div>
  );
}
