// Shared colours and styles for every chart, so they all look like one system.
// Text never uses the data colours — only the text tokens below.

export const chart = {
  accent: "#1db954", // the series the story is about (current year, main metric)
  compare: "#8a8a8a", // the main comparison (e.g. last year)
  context: "#4d4d4d", // background series (older years)
  grid: "rgba(255,255,255,0.06)",
  axisText: "#a7a7a7",
  tooltipBg: "#282828",
  surface: "#181818", // card background — used for the 2px gap/ring around marks
};

// Sequential ramp for the heatmap: one hue (green), dark -> bright = little -> a lot.
export const heatRamp = ["#232323", "#173d27", "#1a5c34", "#1b7d41", "#1db954", "#72e09c"];

export const axisTick = { fill: chart.axisText, fontSize: 12 };

export const tooltipStyle = {
  contentStyle: { background: chart.tooltipBg, border: "none", borderRadius: 12, color: "#fff" },
  labelStyle: { color: chart.axisText },
  itemStyle: { color: "#fff" },
};

/** Axis ticks: full numbers under 10,000, compact above (12K). */
export function compactTick(v: number): string {
  if (Math.abs(v) >= 10_000) return `${Math.round(v / 1000)}K`;
  return Math.round(v).toLocaleString("en-US");
}
