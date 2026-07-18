import { FormEvent, useEffect, useState } from "react";
import api from "../api/client";
import type { DMContext } from "../pages/DataManagement";

const ENTITIES = [
  { key: "participants", label: "선발자 명단", cols: "이름, 성별, 연령대, 학교급, 지역, 소속, 배려대상, 선발일, 상태" },
  { key: "payments", label: "지급 내역", cols: "예산항목(지원금/심사관리비/프로그램운영비), 지급유형, 계획금액, 지급액, 지급일, 상태" },
  { key: "partners", label: "협력기관", cols: "기관명, 유형, 협력내용, 담당자, 협약시작, 협약종료, 상태" },
  { key: "growth_metrics", label: "성장관리 성과", cols: "지표명, 목표값, 실적값, 측정일" },
  { key: "surveys", label: "만족도 설문", cols: "설문유형, 제목, 응답수, 평균점수, 실시일" },
];

export default function ImportPanel({ ctx }: { ctx: DMContext }) {
  const { projects } = ctx;
  const [projectId, setProjectId] = useState<number | "">("");
  const [entity, setEntity] = useState("participants");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (projectId === "" && projects.length) setProjectId(projects[0].id);
  }, [projects]);

  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !file) return;
    setBusy(true);
    setResult("");
    const fd = new FormData();
    fd.append("project_id", String(projectId));
    fd.append("file", file);
    try {
      const res = await api.post(`/api/imports/${entity}`, fd);
      setResult(
        `✅ 완료: ${res.data.created}건 추가, ${res.data.skipped}건 건너뜀. ` +
          `인식된 컬럼: ${Object.keys(res.data.matched_columns).join(", ") || "없음"}`
      );
    } catch (err: any) {
      setResult("❌ 오류: " + (err.response?.data?.detail || err.message));
    } finally {
      setBusy(false);
    }
  }

  const current = ENTITIES.find((x) => x.key === entity)!;

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <p className="card-title">엑셀/CSV 파일로 데이터 통합 업로드</p>
      <form onSubmit={upload}>
        <div style={{ marginBottom: 14 }}>
          <label className="field">대상 프로젝트</label>
          <select value={projectId} onChange={(e) => setProjectId(Number(e.target.value))}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.year} · {p.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="field">데이터 종류</label>
          <select value={entity} onChange={(e) => setEntity(e.target.value)}>
            {ENTITIES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select>
          <div className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
            인식 가능한 컬럼(헤더): {current.cols}
            {entity === "participants" && (
              <><br />※ 배려대상은 쉼표로 여러 개 입력 가능 (예: "기초생활수급, 한부모가정")</>
            )}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="field">파일 선택 (.xlsx, .xls, .csv)</label>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <button className="btn primary" disabled={busy || !file || !projectId}>
          {busy ? "업로드 중…" : "업로드"}
        </button>
      </form>
      {result && <div style={{ marginTop: 16, fontSize: 13.5, lineHeight: 1.6 }}>{result}</div>}
    </div>
  );
}
