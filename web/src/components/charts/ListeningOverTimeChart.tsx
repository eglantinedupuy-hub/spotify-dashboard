"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { axisTick, chart, compactTick, tooltipStyle } from "@/lib/chartTheme";
import { dayLabel, formatNumber, monthLabel, MONTH_SHORT } from "@/lib/format";
import type { DayStat, MonthStat, YearStat } from "@/lib/data";

type Granularity = "day" | "month" | "year";

type Props = { daily: DayStat[]; monthly: MonthStat[]; yearly: YearStat[] };

/** Minutes listened per day / month / year, with a year filter. */
export function ListeningOverTimeChart({ daily, monthly, yearly }: Props) {
  const years = yearly.map((y) => y.year);
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [year, setYear] = useState<number | "all">("all");

  const data = useMemo(() => {
    const inYear = (key: string) => year === "all" || key.startsWith(String(year));
    if (granularity === "day")
      return daily.filter((d) => inYear(d.date)).map((d) => ({ key: d.date, label: dayLabel(d.date), minutes: d.minutes }));
    if (granularity === "month")
      return monthly.filter((m) => inYear(m.month)).map((m) => ({ key: m.month, label: monthLabel(m.month), minutes: m.minutes }));
    return yearly.map((y) => ({ key: String(y.year), label: String(y.year), minutes: y.minutes }));
  }, [granularity, year, daily, monthly, yearly]);

  // Short x-axis labels: "Jan 26" for months, "2026" for years, dates for days.
  const tickFormatter = (key: string) => {
    if (granularity === "month") {
      const [y, m] = key.split("-");
      return year === "all" ? `${MONTH_SHORT[Number(m) - 1]} ${y.slice(2)}` : MONTH_SHORT[Number(m) - 1];
    }
    if (granularity === "day") {
      const [y, m, d] = key.split("-");
      // all years: "Mar 25" (month + year); one year: "Mar 5"
      return year === "all" ? `${MONTH_SHORT[Number(m) - 1]} ${y.slice(2)}` : `${MONTH_SHORT[Number(m) - 1]} ${Number(d)}`;
    }
    return key;
  };

  const average = data.length ? data.reduce((s, d) => s + d.minutes, 0) / data.length : 0;
  const unit = granularity === "day" ? "day" : granularity === "month" ? "month" : "year";

  return (
    <div>
      {/* Filters: one row above the chart */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          options={[{ value: "day", label: "Day" }, { value: "month", label: "Month" }, { value: "year", label: "Year" }]}
          value={granularity}
          onChange={(v) => setGranularity(v as Granularity)}
        />
        {granularity !== "year" && (
          <select
            value={year}
            onChange={(e) => setYear(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="rounded-full bg-card-hover px-3 py-1.5 text-sm text-foreground outline-none"
            aria-label="Filter by year"
          >
            <option value="all">All years</option>
            {[...years].reverse().map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )}
        <span className="ml-auto text-sm text-muted">
          Average: <span className="font-semibold text-foreground">{formatNumber(average)}</span> min / {unit}
        </span>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {granularity === "day" ? (
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={chart.grid} />
              <XAxis dataKey="key" tickFormatter={tickFormatter} tick={axisTick} tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={52} tickFormatter={compactTick} />
              <Tooltip {...tooltipStyle} labelFormatter={(_, p) => p?.[0]?.payload?.label} formatter={(v) => [`${formatNumber(Number(v))} min`, "Listened"]} />
              <Area type="monotone" dataKey="minutes" stroke={chart.accent} strokeWidth={2} fill={chart.accent} fillOpacity={0.1} dot={false} activeDot={{ r: 4, stroke: chart.surface, strokeWidth: 2 }} />
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={chart.grid} />
              <XAxis dataKey="key" tickFormatter={tickFormatter} tick={axisTick} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={52} tickFormatter={compactTick} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.05)" }} labelFormatter={(_, p) => p?.[0]?.payload?.label} formatter={(v) => [`${formatNumber(Number(v))} min`, "Listened"]} />
              <Bar dataKey="minutes" fill={chart.accent} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Pill-style toggle, e.g. Day | Month | Year */
function Segmented({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex rounded-full bg-card-hover p-1" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1 text-sm transition ${value === o.value ? "bg-white text-black" : "text-muted hover:text-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
