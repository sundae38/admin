// 데이터 시각화 검증 팔레트 (dataviz 스킬 검증 통과). 슬롯 순서 = CVD 안전 순서.
export const CATEGORICAL = [
  "#2a78d6", // blue
  "#008300", // green
  "#e87ba4", // magenta
  "#eda100", // yellow
  "#1baf7a", // aqua
  "#eb6834", // orange
  "#4a3aa7", // violet
  "#e34948", // red
];

export const STATUS_COLORS: Record<string, string> = {
  진행중: "#2a78d6",
  완료: "#0ca30c",
  예정: "#898781",
};

export function seriesColor(index: number): string {
  return CATEGORICAL[index % CATEGORICAL.length];
}
