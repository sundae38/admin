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

import type { Project } from "./api/types";

// 프로젝트를 상위 유형별로 묶음 (상위유형 → 프로젝트명 계층 표시용)
export function groupProjectsByType(projects: Project[]): [string, Project[]][] {
  const m: Record<string, Project[]> = {};
  projects.forEach((p) => {
    (m[p.project_type || "기타"] ??= []).push(p);
  });
  return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0], "ko"));
}

// 설문 유형 표시명 (내부값 전체→사업, 프로그램→프로그램)
export function surveyTypeLabel(t: string): string {
  return t === "프로그램" ? "프로그램 만족도" : "사업 만족도";
}

export function datetime(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
