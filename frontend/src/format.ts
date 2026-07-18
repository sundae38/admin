export function won(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}만`;
  return value.toLocaleString("ko-KR");
}

export function wonFull(value: number): string {
  return value.toLocaleString("ko-KR") + "원";
}

export function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function num(value: number): string {
  return value.toLocaleString("ko-KR");
}

export function datetime(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
