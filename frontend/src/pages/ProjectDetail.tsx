import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client";
import type {
  GrowthMetric,
  Participant,
  Partner,
  Payment,
  Program,
  ProjectKPI,
  Survey,
} from "../api/types";
import KPITile from "../components/KPITile";
import { BarCard, DonutCard } from "../components/charts";
import { num, pct, won, wonFull } from "../format";

const TABS = ["선발", "지급·예산", "성장관리 프로그램", "성장관리 성과", "만족도", "협력기관"];

export default function ProjectDetail() {
  const { id } = useParams();
  const projectId = Number(id);
  const [kpi, setKpi] = useState<ProjectKPI | null>(null);
  const [tab, setTab] = useState("선발");
  const [loading, setLoading] = useState(true);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [growth, setGrowth] = useState<GrowthMetric[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<ProjectKPI>(`/api/kpi/project/${projectId}`),
      api.get<Participant[]>(`/api/participants`, { params: { project_id: projectId } }),
      api.get<Payment[]>(`/api/payments`, { params: { project_id: projectId } }),
      api.get<Program[]>(`/api/programs`, { params: { project_id: projectId } }),
      api.get<GrowthMetric[]>(`/api/growth-metrics`, { params: { project_id: projectId } }),
      api.get<Survey[]>(`/api/surveys`, { params: { project_id: projectId } }),
      api.get<Partner[]>(`/api/partners`, { params: { project_id: projectId } }),
    ])
      .then(([k, pa, pay, pr, g, s, pt]) => {
        setKpi(k.data);
        setParticipants(pa.data);
        setPayments(pay.data);
        setPrograms(pr.data);
        setGrowth(g.data);
        setSurveys(s.data);
        setPartners(pt.data);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading && !kpi) return <div className="loading">불러오는 중…</div>;
  if (!kpi) return null;

  return (
    <div>
      <Link to="/" className="muted" style={{ fontSize: 13 }}>← 전체 대시보드</Link>
      <div className="toolbar" style={{ marginTop: 8 }}>
        <div>
          <h1 className="page-title">{kpi.project_name}</h1>
          <p className="page-sub" style={{ margin: 0 }}>
            <span className="badge 진행중" style={{ background: "#eef1f5", color: "#334" }}>{kpi.project_type}</span>{" "}
            {kpi.year}년 · <span className={`badge ${kpi.status}`}>{kpi.status}</span>
          </p>
        </div>
      </div>

      {/* 프로세스 파이프라인 */}
      <div className="pipeline">
        <PipeStep stage="① 선발" metric={`${num(kpi.selected_count)}명`} sub={`경쟁률 ${kpi.competition_rate.toFixed(1)}:1`} />
        <PipeStep stage="② 지급" metric={pct(kpi.execution_rate)} sub={`총예산 집행 · 지원금 ${pct(kpi.grant_execution_rate)}`} />
        <PipeStep stage="③ 성장관리 프로그램" metric={pct(kpi.program_participation_rate)} sub={`참여율 · 만족도 ${kpi.program_satisfaction || "-"}`} />
        <PipeStep stage="④ 성장관리" metric={pct(kpi.growth_achievement_rate)} sub="성과 달성률" />
        <PipeStep stage="⑤ 만족도" metric={kpi.overall_satisfaction ? kpi.overall_satisfaction.toFixed(2) : "-"} sub="전체 만족도 /5" />
      </div>

      {/* KPI 타일 */}
      <div className="kpi-grid">
        <KPITile label="선발인원 / 목표" value={`${num(kpi.selected_count)}`} unit={`/${num(kpi.target_headcount)}명`} />
        <KPITile label="교육적 배려대상" value={num(kpi.special_care_count)} unit="명" />
        <KPITile label="경쟁률" value={`${kpi.competition_rate.toFixed(1)}`} unit=": 1" sub={`지원 ${num(kpi.applicant_count)}명`} />
        <KPITile label="총예산 집행률" value={pct(kpi.execution_rate)} sub={wonFull(kpi.total_paid)} />
        <KPITile label="지원금 집행률" value={pct(kpi.grant_execution_rate)} sub={wonFull(kpi.grant_paid)} />
        <KPITile label="프로그램 참여율" value={pct(kpi.program_participation_rate)} />
        <KPITile label="전체 만족도" value={kpi.overall_satisfaction ? kpi.overall_satisfaction.toFixed(2) : "-"} unit="/5" />
        <KPITile label="협력기관" value={num(kpi.partner_count)} unit="개" />
      </div>

      {/* 단계별 탭 */}
      <div className="tabs">
        {TABS.map((t) => (
          <div key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</div>
        ))}
      </div>

      {tab === "선발" && (
        <>
          <div className="chart-grid">
            <DonutCard title="성별 구성" data={kpi.gender_distribution} />
            <DonutCard title="학교급 구성" data={kpi.school_distribution} />
            <DonutCard title="교육적 배려대상 구성" data={kpi.special_care_distribution} />
            <DonutCard title="지역 구성" data={kpi.region_distribution} />
          </div>
          <SimpleTable
            columns={["이름", "성별", "학교급", "지역", "배려대상", "상태"]}
            rows={participants.map((p) => [
              p.name,
              p.gender,
              p.school_level,
              p.region,
              (p.special_categories || []).join(", "),
              p.status,
            ])}
            empty="선발자 데이터가 없습니다."
          />
        </>
      )}

      {tab === "지급·예산" && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <p className="card-title">지원금 집행 요약 (실집행 = 최초지급 + 추가지급 − 반환)</p>
            <div className="kpi-grid" style={{ marginBottom: 0 }}>
              <KPITile label="지원금 총예산" value={won(kpi.grant_budget)} unit="원" />
              <KPITile label="최초지급" value={won(kpi.grant_initial)} unit="원" sub={`최초 선발 ${num(kpi.grant_initial_headcount)}명`} />
              <KPITile label="추가지급" value={won(kpi.grant_additional)} unit="원" />
              <KPITile label="반환" value={won(kpi.grant_returned)} unit="원" />
              <KPITile label="실집행액" value={won(kpi.grant_paid)} unit="원" sub={`집행률 ${pct(kpi.grant_execution_rate)}`} />
              <KPITile label="집행잔액" value={won(kpi.grant_remaining)} unit="원" />
              <KPITile label="지원인원" value={num(kpi.grant_support_headcount)} unit="명" sub="최초+추가−반환" />
            </div>
          </div>
          <div className="chart-grid">
            <div className="card">
              <p className="card-title">용도별 예산 대비 집행</p>
              <div className="table-wrap" style={{ border: "none" }}>
                <table>
                  <thead>
                    <tr><th>용도</th><th className="num">예산</th><th className="num">집행</th><th className="num">집행률</th></tr>
                  </thead>
                  <tbody>
                    {kpi.budget_lines.map((b) => (
                      <tr key={b.label}>
                        <td>{b.label}</td>
                        <td className="num">{won(b.budget)}원</td>
                        <td className="num">{won(b.paid)}원</td>
                        <td className="num">{pct(b.rate)}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 700, background: "var(--surface-2)" }}>
                      <td>총예산</td>
                      <td className="num">{won(kpi.total_budget)}원</td>
                      <td className="num">{won(kpi.total_paid)}원</td>
                      <td className="num">{pct(kpi.execution_rate)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <BarCard
              title="재원별 예산 구성"
              data={kpi.funding_sources.map((f) => ({ label: f.label, value: f.amount }))}
              unit="원"
              color="#eda100"
            />
          </div>
          <SimpleTable
            columns={["예산항목", "구분", "금액", "사유", "일자", "상태"]}
            rows={payments.map((p) => [
              p.budget_category,
              p.grant_kind,
              wonFull(p.paid_amount),
              p.reason,
              p.paid_date,
              p.status,
            ])}
            numeric={[2]}
            empty="지급 데이터가 없습니다."
          />
        </>
      )}

      {tab === "성장관리 프로그램" && (
        <SimpleTable
          columns={["프로그램명", "유형", "시작일", "대상인원", "참여인원"]}
          rows={programs.map((p) => [p.name, p.program_type, p.start_date, num(p.target_count), num(p.participation_count)])}
          numeric={[3, 4]}
          empty="프로그램 데이터가 없습니다."
        />
      )}

      {tab === "성장관리 성과" && (
        <SimpleTable
          columns={["지표명", "목표값", "실적값", "달성률", "측정일"]}
          rows={growth.map((g) => [
            g.metric_name,
            g.target_value.toFixed(1),
            g.actual_value.toFixed(1),
            g.target_value ? pct((g.actual_value / g.target_value) * 100) : "-",
            g.measured_date,
          ])}
          numeric={[1, 2, 3]}
          empty="성과 데이터가 없습니다."
        />
      )}

      {tab === "만족도" && (
        <>
          {kpi.satisfaction_items.length > 0 && (
            <div className="chart-grid">
              <BarCard
                title="전체 만족도 — 항목별 점수 (5점 만점)"
                data={kpi.satisfaction_items.map((i) => ({ label: i.label, value: i.score }))}
                unit="점"
                color="#1baf7a"
              />
            </div>
          )}
          <SimpleTable
            columns={["설문", "유형", "응답수", "평균점수", "항목별 점수", "실시일"]}
            rows={surveys.map((s) => [
              s.title,
              s.survey_type,
              num(s.respondent_count),
              s.avg_score.toFixed(2),
              s.item_scores ? Object.entries(s.item_scores).map(([k, v]) => `${k} ${v}`).join(", ") : "-",
              s.conducted_date,
            ])}
            numeric={[2, 3]}
            empty="설문 데이터가 없습니다."
          />
        </>
      )}

      {tab === "협력기관" && (
        <SimpleTable
          columns={["기관명", "유형", "협력내용", "담당자", "협약기간", "상태"]}
          rows={partners.map((p) => [
            p.name,
            p.partner_type,
            p.contribution,
            p.contact,
            p.agreement_start && p.agreement_end ? `${p.agreement_start} ~ ${p.agreement_end}` : "-",
            p.status,
          ])}
          empty="협력기관 데이터가 없습니다."
        />
      )}
    </div>
  );
}

function PipeStep({ stage, metric, sub }: { stage: string; metric: string; sub: string }) {
  return (
    <div className="step">
      <div className="stage">{stage}</div>
      <div className="metric">{metric}</div>
      <div className="metric-sub">{sub}</div>
    </div>
  );
}

function SimpleTable({
  columns,
  rows,
  numeric = [],
  empty,
}: {
  columns: string[];
  rows: (string | number | null)[][];
  numeric?: number[];
  empty: string;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={c} className={numeric.includes(i) ? "num" : ""}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((cell, ci) => (
                <td key={ci} className={numeric.includes(ci) ? "num" : ""}>{cell ?? "-"}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="empty">{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
