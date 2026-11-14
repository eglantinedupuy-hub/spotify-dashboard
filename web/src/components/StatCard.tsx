"use client";

import { useCountUp } from "@/hooks/useCountUp";
import { formatNumber } from "@/lib/format";
import { Card } from "./Card";

type StatCardProps = {
  label: string;
  value: number;
  unit?: string;
  /** % change vs a comparison period; positive = more listening */
  change?: number | null;
  changeLabel?: string;
  href?: string;
};

/** A big animated number with a label and an optional up/down comparison. */
export function StatCard({ label, value, unit, change, changeLabel, href }: StatCardProps) {
  const animated = useCountUp(value);
  return (
    <Card href={href}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl sm:text-4xl font-bold tabular-nums tracking-tight">
        {formatNumber(animated)}
        {unit && <span className="ml-1.5 text-base font-medium text-muted">{unit}</span>}
      </p>
      {change != null && (
        <p className={`mt-2 text-sm ${change >= 0 ? "text-accent" : "text-negative"}`}>
          {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(0)}%
          {changeLabel && <span className="text-muted"> {changeLabel}</span>}
        </p>
      )}
    </Card>
  );
}
