import type { Audit } from "../api/types";
import { datetime } from "../format";

// 감사 로그 표시 — 작성자/작성일시 + 최종 수정자/수정일시
export default function AuditCell({ audit }: { audit: Audit }) {
  return (
    <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--text-muted)" }}>
      <div>작성 {audit.created_by || "-"} · {datetime(audit.created_at)}</div>
      <div>수정 {audit.updated_by || "-"} · {datetime(audit.updated_at)}</div>
    </div>
  );
}
