import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORICAL, seriesColor } from "../theme";

const AXIS = "#898781";
const GRID = "#e1e0d9";

interface BarDatum {
  label: string;
  value: number;
}

// 단일 계열 막대 — 프로젝트별 비교(집행률/만족도 등). 축은 하나만.
export function BarCard({
  title,
  data,
  color = "#2a78d6",
  unit = "",
  height = 260,
}: {
  title: string;
  data: BarDatum[];
  color?: string;
  unit?: string;
  height?: number;
}) {
  return (
    <div className="card">
      <p className="card-title">{title}</p>
      {data.length === 0 ? (
        <div className="empty">데이터가 없습니다.</div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 6, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: AXIS }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              interval={0}
              angle={data.length > 4 ? -18 : 0}
              textAnchor={data.length > 4 ? "end" : "middle"}
              height={data.length > 4 ? 60 : 30}
            />
            <YAxis
              tick={{ fontSize: 12, fill: AXIS }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              formatter={(v: number) => [`${v.toLocaleString("ko-KR")}${unit}`, ""]}
              cursor={{ fill: "rgba(42,120,214,0.06)" }}
            />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={54} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// 2계열 그룹 막대 — 유형별 총예산 vs 지원금 집행률. 단일 축(%) 유지.
export function GroupedBarCard({
  title,
  data,
  seriesA,
  seriesB,
  labelA,
  labelB,
  unit = "%",
  height = 280,
}: {
  title: string;
  data: Record<string, string | number>[];
  seriesA: string;
  seriesB: string;
  labelA: string;
  labelB: string;
  unit?: string;
  height?: number;
}) {
  return (
    <div className="card">
      <p className="card-title">{title}</p>
      {data.length === 0 ? (
        <div className="empty">데이터가 없습니다.</div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 6, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: AXIS }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              interval={0}
              angle={data.length > 3 ? -15 : 0}
              textAnchor={data.length > 3 ? "end" : "middle"}
              height={data.length > 3 ? 54 : 30}
            />
            <YAxis tick={{ fontSize: 12, fill: AXIS }} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              formatter={(v: number) => `${v.toLocaleString("ko-KR")}${unit}`}
              cursor={{ fill: "rgba(42,120,214,0.06)" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={9} />
            <Bar dataKey={seriesA} name={labelA} fill={CATEGORICAL[0]} radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey={seriesB} name={labelB} fill={CATEGORICAL[4]} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// 라인 — 월별 누적 집행률 추이. 단일 축(%).
export function LineCard({
  title,
  data,
  xKey,
  yKey,
  unit = "%",
  color = "#2a78d6",
  height = 260,
}: {
  title: string;
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  unit?: string;
  color?: string;
  height?: number;
}) {
  return (
    <div className="card">
      <p className="card-title">{title}</p>
      {data.length === 0 ? (
        <div className="empty">데이터가 없습니다.</div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 6, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
            <YAxis tick={{ fontSize: 12, fill: AXIS }} tickLine={false} axisLine={false} width={44} />
            <Tooltip formatter={(v: number) => `${v.toLocaleString("ko-KR")}${unit}`} />
            <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// 구성 도넛 — 선발인원 세부구성(성별/연령/지역/유형).
export function DonutCard({
  title,
  data,
  height = 240,
}: {
  title: string;
  data: BarDatum[];
  height?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="card">
      <p className="card-title">{title}</p>
      {total === 0 ? (
        <div className="empty">데이터가 없습니다.</div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={52}
              outerRadius={82}
              paddingAngle={2}
              stroke="#fcfcfb"
              strokeWidth={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={seriesColor(i)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, n: string) => [
                `${v.toLocaleString("ko-KR")}명 (${((v / total) * 100).toFixed(0)}%)`,
                n,
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              iconType="circle"
              iconSize={9}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export { CATEGORICAL };
