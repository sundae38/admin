import { FormEvent, useEffect, useState } from "react";
import api from "../api/client";
import type { DMContext } from "../pages/DataManagement";
import { groupProjectsByType } from "../format";

const ENTITIES = [
  { key: "participants", label: "선발자 명단", cols: "이름, 성별, 연령대, 학교급, 지역, 소속, 교육약자, 선발일, 상태" },
  { key: "payments", label: "장학금(지원금)·지급 내역", cols: "예산항목(지원금/심사관리비/프로그램운영비), 구분(최초지급/추가지급/반환), 인원수, 사유, 금액, 지급일, 상태" },
  { key: "partners", label: "협력기관", cols: "기관명, 유형, 협력내용, 담당자, 협약시작, 협약종료, 상태" },
  { key: "growth_metrics", label: "성장관리 성과", cols: "지표명, 목표값, 실적값, 측정일" },
  { key: "surveys", label: "만족도 설문", cols: "설문유형, 제목, 응답수, 평균점수, 실시일" },
];

async function downloadFile(url: string, filename: string) {
  const res = await api.get(url, { responseType: "blob" });
  const blobUrl = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

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

  const current = ENTITIES.find((x) => x.key === entity)!;
  const projName = projects.find((p) => p.id === projectId)?.name || "프로젝트";

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

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
      {/* 업로드 */}
      <div className="card" style={{ flex: 1, minWidth: 380 }}>
        <p className="card-title">① 엑셀/CSV 업로드 (가져오기)</p>
        <form onSubmit={upload}>
          <div style={{ marginBottom: 14 }}>
            <label className="field">대상 프로젝트</label>
            <select value={projectId} onChange={(e) => setProjectId(Number(e.target.value))}>
              {groupProjectsByType(projects).map(([type, ps]) => (
                <optgroup key={type} label={type}>
                  {ps.map((p) => <option key={p.id} value={p.id}>{p.year} · {p.name}</option>)}
                </optgroup>
              ))}
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
                <><br />※ 교육약자는 쉼표로 여러 개 입력 가능 (예: "기초생활수급, 한부모가정")</>
              )}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <button type="button" className="btn small" onClick={() => downloadFile(`/api/export/template/${entity}`, `${current.label}_업로드양식.csv`)}>
              📄 빈 양식(템플릿) 다운로드
            </button>
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

      {/* 다운로드(내보내기) */}
      <div className="card" style={{ flex: 1, minWidth: 380 }}>
        <p className="card-title">② 현재 데이터 다운로드 (내보내기)</p>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>선택한 프로젝트·종류의 현재 데이터를 엑셀(.xlsx)로 내려받습니다.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {ENTITIES.map((x) => (
            <div key={x.key} className="row" style={{ justifyContent: "space-between", borderBottom: "1px solid var(--grid)", paddingBottom: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 500 }}>{x.label}</span>
              <button className="btn small" disabled={!projectId}
                onClick={() => downloadFile(`/api/export/${x.key}?project_id=${projectId}`, `${x.label}_${projName}.xlsx`)}>
                ⬇ 다운로드
              </button>
            </div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
          ※ 다운로드한 엑셀은 헤더가 업로드 양식과 동일해, 수정 후 그대로 다시 업로드할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
