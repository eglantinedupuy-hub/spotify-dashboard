"use client";

import { useState } from "react";
import { heatRamp } from "@/lib/chartTheme";
import { formatNumber, hourLabel } from "@/lib/format";

type Props = {
  weekdays: string[]; // ["Mon", ...]
  minutes: number[][]; // [weekday][hour]
};

const FULL_DAY: Record<string, string> = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
};

/**
 * Weekday x hour grid. Each cell's colour = minutes listened in that slot (all-time).
 * Colour steps are quantiles so the pattern stays visible even if a few slots are huge.
 */
export function Heatmap({ weekdays, minutes }: Props) {
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);

  // Thresholds: split the non-zero values into equal-sized groups, one per ramp step.
  const values = minutes.flat().filter((v) => v > 0).sort((a, b) => a - b);
  const steps = heatRamp.length - 1;
  const thresholds = Array.from({ length: steps - 1 }, (_, i) => values[Math.floor(((i + 1) / steps) * values.length)] ?? Infinity);
  const colorFor = (v: number) => {
    if (v <= 0) return heatRamp[0];
    const bucket = thresholds.filter((t) => v >= t).length; // 0..steps-1
    return heatRamp[bucket + 1];
  };

  const hovered = hover ? minutes[hover.d][hover.h] : null;

  return (
    <div>
      {/* Tooltip line (fixed position above the grid, so it never covers cells) */}
      <p className="mb-3 h-5 text-sm" aria-live="polite">
        {hover ? (
          <>
            <span className="font-semibold">{FULL_DAY[weekdays[hover.d]]} · {hourLabel(hover.h)}</span>
            <span className="text-muted"> — {formatNumber(hovered ?? 0)} min listened</span>
          </>
        ) : (
          <span className="text-muted">Hover or tap a square to see the minutes</span>
        )}
      </p>

      <div className="overflow-x-auto">
        <div className="grid min-w-[640px] gap-[2px]" style={{ gridTemplateColumns: "44px repeat(24, minmax(0, 1fr))" }}>
          {/* hour labels */}
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="pb-1 text-center text-[10px] text-muted">
              {h % 3 === 0 ? hourLabel(h).replace(" ", "").toLowerCase() : ""}
            </div>
          ))}

          {weekdays.map((day, d) => (
            <div key={day} className="contents">
              <div className="flex items-center text-xs text-muted">{day}</div>
              {minutes[d].map((v, h) => (
                <button
                  key={h}
                  type="button"
                  aria-label={`${FULL_DAY[day]} ${hourLabel(h)}: ${formatNumber(v)} minutes`}
                  onMouseEnter={() => setHover({ d, h })}
                  onFocus={() => setHover({ d, h })}
                  onClick={() => setHover({ d, h })}
                  onMouseLeave={() => setHover(null)}
                  className={`aspect-square rounded-[4px] transition ${
                    hover && hover.d === d && hover.h === h ? "ring-2 ring-white" : ""
                  }`}
                  style={{ background: colorFor(v) }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend: less -> more */}
      <div className="mt-4 flex items-center gap-2 text-xs text-muted">
        <span>Less</span>
        {heatRamp.map((c) => (
          <span key={c} className="inline-block h-3 w-5 rounded-[3px]" style={{ background: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
