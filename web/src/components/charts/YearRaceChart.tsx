"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { axisTick, chart, compactTick, tooltipStyle } from "@/lib/chartTheme";
import { formatNumber } from "@/lib/format";
import { YearLegend, yearColor } from "./YearLegend";

type Props = {
  /** one row per x position; each year is a key holding a number (or null where there's no data yet) */
  rows: Record<string, number | string | null>[];
  xKey: string; // which field is the x axis label
  years: number[];
  currentYear: number;
  ticks?: string[]; // which x labels to show
};

/** One line per year on a shared x axis (day of year or month). Current year green, last year light grey. */
export function YearRaceChart({ rows, xKey, years, currentYear, ticks }: Props) {
  return (
    <div>
      <YearLegend years={years} currentYear={currentYear} />
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={chart.grid} />
            <XAxis dataKey={xKey} ticks={ticks} interval={ticks ? 0 : "preserveStartEnd"} tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} width={52} tickFormatter={compactTick} />
            <Tooltip
              {...tooltipStyle}
              itemSorter={(item) => -Number(item.dataKey)} // newest year first
              formatter={(v, name) => [`${formatNumber(Number(v))} min`, name]}
            />
            {years.map((y) => (
              <Line
                key={y}
                type="monotone"
                dataKey={String(y)}
                name={String(y)}
                stroke={yearColor(y, currentYear)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: chart.surface, strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
