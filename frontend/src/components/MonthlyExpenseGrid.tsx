import { useEffect, useState } from "react";
import api from "../api/client";
import type { Payment, Project } from "../api/types";
import type { DMContext } from "../pages/DataManagement";
import { groupProjectsByType, pct, won } from "../format";

// 예산과목(프로젝트 예산 기준) — 담당자가 월별 지출액을 일괄 입력
const CATEGORIES: { name: string; budgetField: keyof Project }[] = [
  { name: "인건비", budgetField: "budget_personnel" },
  { name: "심사운영비", budgetField: "budget_review" },
  { name: "사업운영비", budgetField: "budget_program" },
];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const MARK = "월별집행";
const pad = (n: number) => String(n).padStart(2, "0");

export default function MonthlyExpenseGrid({ ctx }: { ctx: DMContext }) {
  const { projects } = ctx;
  const [projectId, setProjectId] = useState<number | "">("");
  const [cells, setCells] = useState<Record<string, Record<number, number>>>({});
  const [ids, setIds] = useState<Record<string, Record<number, number>>>({});
  const [saving, setSaving] = useState("");

  const project = projects.find((p) => p.id === projectId);
  const year = project?.year ?? new Date().getFullYear();

  useEffect(() => {
    if (projectId === "" && projects.length) setProjectId(projects[0].id);
  }, [projects]);

  function load() {
    if (projectId === "") return;
    const names = CATEGORIES.map((c) => c.name);
    api.get<Payment[]>("/api/payments", { params: { project_id: projectId } }).then((r) => {
      const c: Record<string, Record<number, number>> = {};
      const idm: Record<string, Record<number, number>> = {};
      names.forEach((n) => { c[n] = {}; idm[n] = {}; });
      r.data
        .filter((p) => names.includes(p.budget_category) && p.payment_type === MARK && p.paid_date)
        .forEach((p) => {
          const m = parseInt(p.paid_date!.slice(5, 7), 10);
          c[p.budget_category][m] = p.paid_amount;
          idm[p.budget_category][m] = p.id;
        });
      setCells(c);
      setIds(idm);
    });
  }
  useEffect(load, [projectId]);

  const setCell = (cat: string, m: number, v: number) =>
    setCells((prev) => ({ ...prev, [cat]: { ...(prev[cat] || {}), [m]: v } }));

  async function saveCell(cat: string, m: number) {
    if (projectId === "") return;
    const value = cells[cat]?.[m] || 0;
    const existing = ids[cat]?.[m];
    setSaving(`${cat} ${m}월 저장 중…`);
    try {
      if (value > 0 && !existing) {
        const res = await api.post("/api/payments", {
          project_id: projectId, budget_category: cat, payment_type: MARK,
          grant_kind: "최초지급", paid_amount: value, planned_amount: 0,
          paid_date: `${year}-${pad(m)}-01`, status: "지급완료",
        });
        setIds((prev) => ({ ...prev, [cat]: { ...(prev[cat] || {}), [m]: res.data.id } }));
      } else if (value > 0 && existing) {
        await api.put(`/api/payments/${existing}`, { paid_amount: value, paid_date: `${year}-${pad(m)}-01` });
      } else if (value <= 0 && existing) {
        await api.delete(`/api/payments/${existing}`);
        setIds((prev) => { const n = { ...prev, [cat]: { ...(prev[cat] || {}) } }; delete n[cat][m]; return n; });
      }
      setSaving("저장됨 ✓");
      setTimeout(() => setSaving(""), 1000);
    } catch {
      setSaving("저장 실패");
    }
  }

  const rowTotal = (cat: string) => MONTHS.reduce((s, m) => s + (cells[cat]?.[m] || 0), 0);
  const budgetOf = (bf: keyof Project) => (project ? (project[bf] as number) || 0 : 0);

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
          <span className="muted">{year}년 · 월별 지출액(원)</span>
        </div>
        <span className="muted">{saving}</span>
      </div>

      {/* 예산 대비 집행 요약 (프로젝트 예산 기준) */}
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        {CATEGORIES.map((c) => {
          const bud = budgetOf(c.budgetField);
          const paid = rowTotal(c.name);
          return (
            <div key={c.name} className="kpi-tile">
              <div className="label">{c.name} <span className="muted">집행률 {pct(bud ? (paid / bud) * 100 : 0)}</span></div>
              <div className="value" style={{ fontSize: 18 }}>{won(paid)} <span className="unit">/ 예산 {won(bud)}원</span></div>
            </div>
          );
        })}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ position: "sticky", left: 0 }}>예산과목</th>
              <th className="num">예산</th>
              {MONTHS.map((m) => <th key={m} className="num">{m}월</th>)}
              <th className="num">집행합계</th>
              <th className="num">잔액</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((c) => {
              const bud = budgetOf(c.budgetField);
              const paid = rowTotal(c.name);
              return (
                <tr key={c.name}>
                  <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{c.name}</td>
                  <td className="num muted">{won(bud)}</td>
                  {MONTHS.map((m) => (
                    <td key={m} className="num" style={{ padding: 4 }}>
                      <input type="number" min={0} value={cells[c.name]?.[m] ?? 0}
                        onChange={(e) => setCell(c.name, m, Number(e.target.value))}
                        onBlur={() => saveCell(c.name, m)}
                        style={{ width: 86, padding: "4px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums" }} />
                    </td>
                  ))}
                  <td className="num" style={{ fontWeight: 700 }}>{won(paid)}</td>
                  <td className="num" style={{ color: bud - paid < 0 ? "var(--danger)" : undefined }}>{won(bud - paid)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="muted" style={{ fontSize: 12.5, marginTop: 10, lineHeight: 1.6 }}>
        ※ 예산은 <b>프로젝트 관리</b>에서 입력한 인건비·심사운영비·사업운영비 값을 사용합니다. 각 칸에 <b>월별 지출액</b>을 입력하면 자동 저장되고, 집행률·잔액이 계산됩니다.
      </p>
    </div>
  );
}
