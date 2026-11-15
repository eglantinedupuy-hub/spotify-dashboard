import { chart } from "@/lib/chartTheme";

/** Colour for a year's line: current year = green, last year = light grey, older = dark grey. */
export function yearColor(year: number, currentYear: number): string {
  if (year === currentYear) return chart.accent;
  if (year === currentYear - 1) return chart.compare;
  return chart.context;
}

/** Legend row: a short coloured line-key next to each year (text stays in text colours). */
export function YearLegend({ years, currentYear }: { years: number[]; currentYear: number }) {
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {[...years].reverse().map((y) => (
        <span key={y} className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-4 rounded-full" style={{ background: yearColor(y, currentYear) }} />
          {y}
        </span>
      ))}
    </div>
  );
}
