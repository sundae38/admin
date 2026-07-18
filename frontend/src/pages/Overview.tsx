import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import type { OverviewKPI } from "../api/types";
import KPITile from "../components/KPITile";
import { BarCard, DonutCard, GroupedBarCard, LineCard } from "../components/charts";
import { num, pct, won } from "../format";

export default function Overview() {
  const [data, setData] = useState<OverviewKPI | null>(null);
  const [year, setYear] = useState<number | "all">("all");
  const [ptype, setPtype] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // 필터 옵션(연도/유형)은 항상 전체 기준으로 유지
  const [allYears, setAllYears] = useState<string[]>([]);
  const [allTypes, setAllTypes] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const params: Record<string, unknown> = {};
    if (year !== "all") params.year = year;
    if (ptype !== "all") params.project_type = ptype;
    api
      .get<OverviewKPI>("/api/kpi/overview", { params })
      .then((res) => {
        setData(res.data);
        if (allYears.length === 0) setAllYears(res.data.projects_by_year.map((d) => d.label));
        if (allTypes.length === 0) setAllTypes(res.data.projects_by_type.map((d) => d.label));
      })
      .finally(() => setLoading(false));
  }, [year, ptype]);

  if (loading && !data) return <div className="loading">불러오는 중…</div>;
  if (!data) return null;

  const shortName = (s: string) => (s.length > 10 ? s.slice(0, 9) + "…" : s);
  const execData = data.projects.map((p) => ({ label: shortName(p.project_name), value: p.execution_rate }));
  const satData = data.projects
    .filter((p) => p.overall_satisfaction > 0)
    .map((p) => ({ label: shortName(p.project_name), value: p.overall_satisfaction }));

  // 유형별 집행률 (총예산 vs 지원금)
  const typeExec = data.execution_by_type.map((e) => ({
    label: e.label,
    total: e.total_rate,
    grant: e.grant_rate,
  }));

  // 월별 지원금 지급·집행 추이
  const monthAmt = data.monthly_execution.map((m) => ({
    label: m.month,
    paid: Math.round(m.grant_paid / 1e6),
    returned: Math.round(m.returned / 1e6),
  }));
  const monthRate = data.monthly_execution.map((m) => ({
    month: m.month,
    rate: m.cumulative_rate,
  }));

  return (
    <div>
      <div className="toolbar">
        <div>
          <h1 className="page-title">전체 대시보드</h1>
          <p className="page-sub" style={{ margin: 0 }}>
            모든 사업(프로젝트)의 핵심 지표를 유형별로 확인합니다.
          </p>
        </div>
        <div className="row">
          <label className="field" style={{ margin: 0 }}>유형</label>
          <select value={ptype} onChange={(e) => setPtype(e.target.value)} style={{ width: 150 }}>
            <option value="all">전체 유형</option>
            {allTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <label className="field" style={{ margin: 0 }}>연도</label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value === "all" ? "all" : Number(e.target.value))}
            style={{ width: 110 }}
          >
            <option value="all">전체</option>
            {allYears.map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
        </div>
      </div>

      {/* 핵심 KPI */}
      <div className="kpi-grid">
        <KPITile label="총 프로젝트 수" value={num(data.total_projects)} unit="개" />
        <KPITile label="총 선발인원" value={num(data.total_selected)} unit="명" />
        <KPITile label="교육적 배려대상" value={num(data.total_special_care)} unit="명" sub="선발인원 중 통합" />
        <KPITile label="총예산" value={won(data.total_budget)} unit="원" sub={`집행 ${won(data.total_paid)}원`} />
        <KPITile label="평균 만족도" value={data.avg_satisfaction.toFixed(2)} unit="/5" />
        <KPITile label="협력기관" value={num(data.total_partners)} unit="개" />
      </div>

      {/* 유형 통합 집행률 (총예산 / 지원금) */}
      <div className="card" style={{ marginBottom: 22 }}>
        <p className="card-title">유형 통합 집행률</p>
        <div className="kpi-grid" style={{ marginBottom: 0 }}>
          <KPITile
            label="총예산 대비 집행률"
            value={pct(data.integrated_execution.total_rate)}
            sub={`${won(data.integrated_execution.total_paid)} / ${won(data.integrated_execution.total_budget)}원`}
          />
          <KPITile
            label="지원금 예산 대비 집행률"
            value={pct(data.integrated_execution.grant_rate)}
            sub={`실집행 ${won(data.integrated_execution.grant_paid)} / 예산 ${won(data.integrated_execution.grant_budget)}원`}
          />
          <KPITile
            label="지원금 집행잔액"
            value={won(data.integrated_execution.grant_remaining)}
            unit="원"
            sub="총예산 − 실집행(최초+추가−반환)"
          />
        </div>
      </div>

      {/* 월별 지원금 지급·집행 추이 */}
      <div className="chart-grid">
        <GroupedBarCard
          title="월별 지원금 지급·반환 (백만원)"
          data={monthAmt}
          seriesA="paid"
          seriesB="returned"
          labelA="지급(최초+추가)"
          labelB="반환"
          unit="백만원"
        />
        <LineCard
          title="월별 누적 지원금 집행률 (%)"
          data={monthRate}
          xKey="month"
          yKey="rate"
          unit="%"
          color="#2a78d6"
        />
      </div>

      {/* 유형별 집행률 비교 + 유형별 프로젝트 수 */}
      <div className="chart-grid">
        <GroupedBarCard
          title="유형별 집행률 (총예산 vs 지원금)"
          data={typeExec}
          seriesA="total"
          seriesB="grant"
          labelA="총예산 대비"
          labelB="지원금 대비"
          unit="%"
        />
        <DonutCard title="유형별 프로젝트 수" data={data.projects_by_type} />
      </div>

      {/* 배려대상·학교급 통합 */}
      <div className="chart-grid">
        <DonutCard title="교육적 배려대상 구성 (통합)" data={data.special_care_distribution} />
        <BarCard title="학교급별 선발인원 (통합)" data={data.school_distribution} unit="명" color="#4a3aa7" />
      </div>

      {/* 프로젝트별 비교 */}
      <div className="chart-grid">
        <BarCard title="프로젝트별 총예산 집행률 (%)" data={execData} unit="%" color="#2a78d6" />
        <BarCard title="프로젝트별 전체 만족도 (5점)" data={satData} unit="점" color="#1baf7a" />
      </div>

      {/* 유형별 집행률 표 */}
      <div className="card" style={{ marginBottom: 22 }}>
        <p className="card-title">유형별 예산 집행 현황</p>
        <div className="table-wrap" style={{ border: "none" }}>
          <table>
            <thead>
              <tr>
                <th>유형</th>
                <th className="num">프로젝트</th>
                <th className="num">총예산</th>
                <th className="num">총예산 집행률</th>
                <th className="num">지원금 예산</th>
                <th className="num">지원금 집행률</th>
                <th className="num">지원금 집행잔액</th>
              </tr>
            </thead>
            <tbody>
              {data.execution_by_type.map((e) => (
                <tr key={e.label}>
                  <td style={{ fontWeight: 600 }}>{e.label}</td>
                  <td className="num">{e.project_count}개</td>
                  <td className="num">{won(e.total_budget)}원</td>
                  <td className="num">{pct(e.total_rate)}</td>
                  <td className="num">{won(e.grant_budget)}원</td>
                  <td className="num">{pct(e.grant_rate)}</td>
                  <td className="num">{won(e.grant_remaining)}원</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700, background: "var(--surface-2)" }}>
                <td>통합</td>
                <td className="num">{data.integrated_execution.project_count}개</td>
                <td className="num">{won(data.integrated_execution.total_budget)}원</td>
                <td className="num">{pct(data.integrated_execution.total_rate)}</td>
                <td className="num">{won(data.integrated_execution.grant_budget)}원</td>
                <td className="num">{pct(data.integrated_execution.grant_rate)}</td>
                <td className="num">{won(data.integrated_execution.grant_remaining)}원</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 프로젝트 목록 */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>프로젝트명</th>
              <th>유형</th>
              <th>연도</th>
              <th>상태</th>
              <th className="num">선발인원</th>
              <th className="num">배려대상</th>
              <th className="num">총예산 집행</th>
              <th className="num">지원금 집행</th>
              <th className="num">만족도</th>
            </tr>
          </thead>
          <tbody>
            {data.projects.map((p) => (
              <tr key={p.project_id} className="clickable" onClick={() => navigate(`/projects/${p.project_id}`)}>
                <td style={{ fontWeight: 600 }}>{p.project_name}</td>
                <td>{p.project_type}</td>
                <td>{p.year}</td>
                <td><span className={`badge ${p.status}`}>{p.status}</span></td>
                <td className="num">{num(p.selected_count)}/{num(p.target_headcount)}</td>
                <td className="num">{num(p.special_care_count)}</td>
                <td className="num">{pct(p.execution_rate)}</td>
                <td className="num">{pct(p.grant_execution_rate)}</td>
                <td className="num">{p.overall_satisfaction > 0 ? p.overall_satisfaction.toFixed(2) : "-"}</td>
              </tr>
            ))}
            {data.projects.length === 0 && (
              <tr><td colSpan={9} className="empty">프로젝트가 없습니다. [데이터 관리]에서 추가하세요.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
