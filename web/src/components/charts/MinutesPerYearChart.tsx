"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/format";

type Props = {
  data: { year: number; minutes: number }[];
  highlightYear: number; // shown in Spotify green, other years in grey
};

/** Bar chart of total minutes listened per year, with hover tooltips. */
export function MinutesPerYearChart({ data, highlightYear }: Props) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: "#a7a7a7", fontSize: 12 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fill: "#a7a7a7", fontSize: 12 }}
            tickFormatter={(v: number) => (v >= 1000 ? `${Number((v / 1000).toFixed(1))}k` : String(v))}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            contentStyle={{ background: "#282828", border: "none", borderRadius: 12, color: "#fff" }}
            labelStyle={{ color: "#a7a7a7" }}
            formatter={(value) => [`${formatNumber(Number(value))} min`, "Listened"]}
          />
          <Bar dataKey="minutes" radius={[4, 4, 0, 0]} maxBarSize={24}>
            {data.map((d) => (
              <Cell key={d.year} fill={d.year === highlightYear ? "#1db954" : "#535353"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
