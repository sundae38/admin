import { useEffect, useState } from "react";
import api from "../api/client";
import type { AuditLog } from "../api/types";
import type { DMContext } from "../pages/DataManagement";
import { datetime } from "../format";

const ACTION_LABEL: Record<string, string> = {
  create: "생성",
  update: "수정",
  delete: "삭제",
  import: "업로드",
};
const ACTION_STYLE: Record<string, { bg: string; fg: string }> = {
  create: { bg: "#dff4df", fg: "#0a6b0a" },
  update: { bg: "#e2edfb", fg: "#184f95" },
  delete: { bg: "#fbe4e4", fg: "#a12121" },
  import: { bg: "#fdf0d9", fg: "#8a5a00" },
};

const ENTITY_TYPES = [
  { key: "projects", label: "프로젝트" },
  { key: "payments", label: "지급/지원금" },
  { key: "partners", label: "협력기관" },
  { key: "surveys", label: "만족도설문" },
  { key: "participants", label: "선발자" },
  { key: "growth_metrics", label: "성장관리성과" },
];

function renderChanges(changes: AuditLog["changes"]): string {
  if (!changes) return "-";
  const parts: string[] = [];
  for (const [key, val] of Object.entries(changes)) {
    if (val && typeof val === "object" && ("before" in val || "after" in val)) {
      const v = val as { before?: unknown; after?: unknown };
      const before = v.before === null || v.before === undefined || v.before === "" ? "∅" : String(v.before);
      const after = v.after === null || v.after === undefined ? "∅" : String(v.after);
      parts.push(`${key}: ${before} → ${after}`);
    } else {
      parts.push(`${key}: ${Array.isArray(val) ? val.join(", ") : String(val)}`);
    }
  }
  return parts.join(" · ");
}

export default function AuditLogPanel({ ctx }: { ctx: DMContext }) {
  const { projects } = ctx;
  const [projectId, setProjectId] = useState<number | "all">("all");
  const [entityType, setEntityType] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    const params: Record<string, unknown> = {};
    if (projectId !== "all") params.project_id = projectId;
    if (entityType !== "all") params.entity_type = entityType;
    if (action !== "all") params.action = action;
    api
      .get<AuditLog[]>("/api/audit", { params })
      .then((r) => setLogs(r.data))
      .finally(() => setLoading(false));
  }
  useEffect(load, [projectId, entityType, action]);

  const projName = (id: number | null) => projects.find((p) => p.id === id)?.name ?? (id ? `#${id}` : "-");

  return (
    <div>
      <div className="toolbar">
        <div className="row">
          <label className="field" style={{ margin: 0 }}>프로젝트</label>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value === "all" ? "all" : Number(e.target.value))} style={{ width: 230 }}>
            <option value="all">전체</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.year} · {p.name}</option>)}
          </select>
          <label className="field" style={{ margin: 0 }}>종류</label>
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)} style={{ width: 130 }}>
            <option value="all">전체</option>
            {ENTITY_TYPES.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
          </select>
          <label className="field" style={{ margin: 0 }}>작업</label>
          <select value={action} onChange={(e) => setAction(e.target.value)} style={{ width: 110 }}>
            <option value="all">전체</option>
            <option value="create">생성</option>
            <option value="update">수정</option>
            <option value="delete">삭제</option>
            <option value="import">업로드</option>
          </select>
        </div>
        <span className="muted">{logs.length}건 (최신순)</span>
      </div>

      {loading ? (
        <div className="loading">불러오는 중…</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 150 }}>일시</th>
                <th>작업자</th>
                <th>작업</th>
                <th>종류</th>
                <th>대상</th>
                <th>프로젝트</th>
                <th>변경내용</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const st = ACTION_STYLE[l.action] || { bg: "#eee", fg: "#333" };
                return (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{datetime(l.created_at)}</td>
                    <td>{l.actor || "-"}</td>
                    <td><span className="badge" style={{ background: st.bg, color: st.fg }}>{ACTION_LABEL[l.action] || l.action}</span></td>
                    <td>{l.entity_label || l.entity_type}</td>
                    <td style={{ fontWeight: 600 }}>{l.summary || "-"}</td>
                    <td className="muted">{projName(l.project_id)}</td>
                    <td style={{ fontSize: 12.5, color: "var(--text-secondary)", maxWidth: 360, whiteSpace: "normal" }}>{renderChanges(l.changes)}</td>
                  </tr>
                );
              })}
              {logs.length === 0 && <tr><td colSpan={7} className="empty">감사 이력이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
