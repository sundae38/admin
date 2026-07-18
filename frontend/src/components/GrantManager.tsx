import { FormEvent, useEffect, useState } from "react";
import api from "../api/client";
import type { Payment } from "../api/types";
import type { DMContext } from "../pages/DataManagement";
import { wonFull } from "../format";
import AuditCell from "./AuditCell";

const KINDS = ["최초지급", "추가지급", "반환"];

const GENDERS = ["남", "여", "기타"];

function empty(projectId: number, kind: string = "최초지급"): Partial<Payment> {
  return {
    project_id: projectId,
    budget_category: "지원금",
    grant_kind: kind,
    initial_headcount: 0,
    gender_counts: {},
    school_counts: {},
    care_counts: {},
    paid_amount: 0,
    reason: "",
    paid_date: "",
    status: "지급완료",
  };
}

export default function GrantManager({ ctx }: { ctx: DMContext }) {
  const { projects, meta } = ctx;
  const careCats = meta?.special_care_categories || [];
  const schoolLevels = meta?.school_levels || [];
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
  const sumHc = (kind: string) => rows.filter((r) => r.grant_kind === kind).reduce((s, r) => s + (r.initial_headcount || 0), 0);
  const initial = sum("최초지급");
  const additional = sum("추가지급");
  const returned = sum("반환");
  const executed = initial + additional - returned;
  // 지원인원 = 최초 인원 + 추가 인원 − 반환 인원
  const supportHc = sumHc("최초지급") + sumHc("추가지급") - sumHc("반환");

  const hcLabel = (kind?: string) =>
    kind === "추가지급" ? "추가 인원" : kind === "반환" ? "반환 인원" : "최초 선발인원";

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
    if (!confirm("이 장학금(지원금) 내역을 삭제할까요?")) return;
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
        <div className="row">
          <button className="btn primary" disabled={projectId === ""} onClick={() => setEditing(empty(Number(projectId), "최초지급"))}>
            + 최초지급
          </button>
          <button className="btn" disabled={projectId === ""} onClick={() => setEditing(empty(Number(projectId), "추가지급"))}>
            + 추가지급
          </button>
          <button className="btn" disabled={projectId === ""} onClick={() => setEditing(empty(Number(projectId), "반환"))}>
            + 반환
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <SumTile label="최초지급" value={initial} />
        <SumTile label="추가지급" value={additional} />
        <SumTile label="반환" value={returned} />
        <SumTile label="실집행액 (최초+추가−반환)" value={executed} highlight />
        <SumTile label="지원인원 (최초+추가−반환)" value={supportHc} unit="명" highlight />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>구분</th><th className="num">금액</th><th className="num">인원수</th><th>세부구성(성별·학교급·교육약자)</th><th>사유</th><th>일자</th><th>상태</th><th>작성/수정 (감사)</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td><span className="badge" style={{ background: p.grant_kind === "반환" ? "#fbe4e4" : "#e2edfb", color: p.grant_kind === "반환" ? "#a12" : "#184f95" }}>{p.grant_kind}</span></td>
                <td className="num">{wonFull(p.paid_amount)}</td>
                <td className="num">{p.initial_headcount ? `${p.grant_kind === "반환" ? "−" : ""}${p.initial_headcount}` : "-"}</td>
                <td style={{ fontSize: 12.5 }}>{summarizeCounts(p) || "-"}</td>
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
            {rows.length === 0 && <tr><td colSpan={9} className="empty">등록된 장학금(지원금) 내역이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h3>{editing.id ? "장학금(지원금) 내역 수정" : `${editing.grant_kind ?? "장학금(지원금)"} 등록`}</h3>
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
              <div>
                <label className="field">{hcLabel(editing.grant_kind)} · 지급인원 (명)</label>
                <input type="number" value={editing.initial_headcount ?? 0} onChange={(e) => set("initial_headcount", Number(e.target.value))} />
              </div>
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

            <div style={{ margin: "18px 0 4px", fontWeight: 600, fontSize: 13.5, color: "var(--text-secondary)", borderTop: "1px solid var(--grid)", paddingTop: 14 }}>
              세부구성 (내부 데이터 관리용) — 지급인원과 별개로 항목별 인원을 직접 입력
            </div>
            <CountRow label="성별별 인원" options={GENDERS} value={editing.gender_counts || {}} onChange={(v) => set("gender_counts", v)} />
            <CountRow label="학교급별 인원" options={schoolLevels} value={editing.school_counts || {}} onChange={(v) => set("school_counts", v)} />
            {careCats.length > 0 ? (
              <CountRow label="교육약자별 인원" options={careCats} value={editing.care_counts || {}} onChange={(v) => set("care_counts", v)} />
            ) : (
              <div className="muted" style={{ fontSize: 12 }}>교육약자 항목이 없습니다. 관리자에게 [사용자 관리 → 교육약자 구분] 추가를 요청하세요.</div>
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

function fmtMap(m: Record<string, number> | null | undefined): string {
  if (!m) return "";
  return Object.entries(m).filter(([, v]) => v > 0).map(([k, v]) => `${k}${v}`).join("·");
}
function summarizeCounts(p: Payment): string {
  const parts = [fmtMap(p.gender_counts), fmtMap(p.school_counts), fmtMap(p.care_counts)].filter(Boolean);
  return parts.join(" / ");
}

function CountRow({ label, options, value, onChange }: {
  label: string; options: string[]; value: Record<string, number>; onChange: (v: Record<string, number>) => void;
}) {
  const total = Object.values(value).reduce((a, b) => a + (Number(b) || 0), 0);
  return (
    <div style={{ marginBottom: 12 }}>
      <label className="field" style={{ marginBottom: 6 }}>{label} <span className="muted">(합계 {total}명)</span></label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((opt) => (
          <label key={opt} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, background: "var(--surface-2)", border: "1px solid var(--grid)", borderRadius: 8, padding: "4px 8px" }}>
            <span>{opt}</span>
            <input
              type="number"
              min={0}
              style={{ width: 58, padding: "3px 6px" }}
              value={value[opt] ?? 0}
              onChange={(e) => {
                const n = Number(e.target.value);
                const next = { ...value };
                if (n > 0) next[opt] = n; else delete next[opt];
                onChange(next);
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function SumTile({ label, value, highlight, unit }: { label: string; value: number; highlight?: boolean; unit?: string }) {
  return (
    <div className="kpi-tile" style={highlight ? { borderColor: "var(--brand)", borderWidth: 2 } : undefined}>
      <div className="label">{label}</div>
      <div className="value" style={{ fontSize: 20 }}>
        {unit ? `${value.toLocaleString("ko-KR")}${unit}` : wonFull(value)}
      </div>
    </div>
  );
}
