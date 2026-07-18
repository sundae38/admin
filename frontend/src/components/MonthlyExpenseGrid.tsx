import { useEffect, useState } from "react";
import api from "../api/client";
import type { Payment } from "../api/types";
import type { DMContext } from "../pages/DataManagement";
import { groupProjectsByType, won } from "../format";

// 장학금(지원금) 외 예산과목 — 담당자가 월별 총액으로 관리
const CATEGORIES = ["심사관리비", "프로그램운영비"];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const MARK = "월별집행"; // 이 그리드가 관리하는 지급 레코드 식별용(payment_type)
const pad = (n: number) => String(n).padStart(2, "0");

export default function MonthlyExpenseGrid({ ctx }: { ctx: DMContext }) {
  const { projects } = ctx;
  const [projectId, setProjectId] = useState<number | "">("");
  // cells[category][month] = 금액,  ids[category][month] = paymentId
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
    api.get<Payment[]>("/api/payments", { params: { project_id: projectId } }).then((r) => {
      const c: Record<string, Record<number, number>> = {};
      const idm: Record<string, Record<number, number>> = {};
      CATEGORIES.forEach((cat) => { c[cat] = {}; idm[cat] = {}; });
      r.data
        .filter((p) => CATEGORIES.includes(p.budget_category) && p.payment_type === MARK && p.paid_date)
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

  function setCell(cat: string, m: number, value: number) {
    setCells((prev) => ({ ...prev, [cat]: { ...(prev[cat] || {}), [m]: value } }));
  }

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
        setIds((prev) => {
          const next = { ...prev, [cat]: { ...(prev[cat] || {}) } };
          delete next[cat][m];
          return next;
        });
      }
      setSaving("저장됨 ✓");
      setTimeout(() => setSaving(""), 1200);
    } catch {
      setSaving("저장 실패");
    }
  }

  const rowTotal = (cat: string) => MONTHS.reduce((s, m) => s + (cells[cat]?.[m] || 0), 0);
  const colTotal = (m: number) => CATEGORIES.reduce((s, cat) => s + (cells[cat]?.[m] || 0), 0);
  const grand = CATEGORIES.reduce((s, cat) => s + rowTotal(cat), 0);

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
          <span className="muted">{year}년 · 예산과목별 월별 집행 총액(원)</span>
        </div>
        <span className="muted">{saving}</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ position: "sticky", left: 0 }}>예산과목</th>
              {MONTHS.map((m) => <th key={m} className="num">{m}월</th>)}
              <th className="num">합계</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((cat) => (
              <tr key={cat}>
                <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{cat}</td>
                {MONTHS.map((m) => (
                  <td key={m} className="num" style={{ padding: 4 }}>
                    <input
                      type="number"
                      min={0}
                      value={cells[cat]?.[m] ?? 0}
                      onChange={(e) => setCell(cat, m, Number(e.target.value))}
                      onBlur={() => saveCell(cat, m)}
                      style={{ width: 90, padding: "4px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}
                    />
                  </td>
                ))}
                <td className="num" style={{ fontWeight: 700 }}>{won(rowTotal(cat))}</td>
              </tr>
            ))}
            <tr style={{ background: "var(--surface-2)", fontWeight: 700 }}>
              <td>월 합계</td>
              {MONTHS.map((m) => <td key={m} className="num">{won(colTotal(m))}</td>)}
              <td className="num">{won(grand)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="muted" style={{ fontSize: 12.5, marginTop: 10, lineHeight: 1.6 }}>
        ※ 각 칸에 <b>월별 집행 총액(원)</b>을 입력하면 자동 저장됩니다. 값을 0으로 지우면 해당 월 기록이 삭제됩니다.<br />
        입력한 금액은 대시보드의 <b>심사관리비·프로그램운영비 집행률</b>에 그대로 반영됩니다.
      </p>
    </div>
  );
}
