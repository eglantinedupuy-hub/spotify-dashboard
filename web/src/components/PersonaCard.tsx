"use client";

import { useState } from "react";
import type { PersonaFit, Personas } from "@/lib/data";

/** "What kind of listener am I": best-fit persona on two axes (when x how), with every trait's score. */
export function PersonaCard({ data }: { data: Personas }) {
  const [period, setPeriod] = useState<"now" | "all_time">("now");
  const p = data[period];
  if (!p) return null;
  const [when, how] = [p.when[0], p.how[0]];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-bold">What kind of listener am I?</h2>
        <div className="flex gap-2">
          {(["now", "all_time"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setPeriod(id)}
              className={`rounded-full px-3 py-1.5 text-sm transition ${period === id ? "bg-white text-black" : "bg-card text-muted hover:bg-card-hover hover:text-foreground"}`}
            >
              {id === "now" ? "Last 12 months" : "All time"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-accent/25 via-card to-card p-6 sm:p-8">
        <p className="text-sm text-muted">{p.fits ? "I’m a" : "Closest match"}</p>
        <p key={p.name} className="mt-1 animate-[fade_300ms_ease-out] text-4xl font-bold tracking-tight sm:text-5xl">{p.name}</p>
        <p className="mt-3 max-w-2xl text-muted">
          <span className="text-foreground">{when.title}:</span> {when.description.toLowerCase()}.{" "}
          <span className="text-foreground">{how.title}:</span> {how.description.toLowerCase()}.
        </p>
        <p className="mt-4 text-xs text-muted">
          {Math.round((p.stats.minutes_per_day as number) ?? 0)} min a day on average · typical session {Math.round((p.stats.median_session_min as number) ?? 0)} min
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Traits title="When I listen" traits={p.when} labels={data.stat_labels} />
        <Traits title="How I listen" traits={p.how} labels={data.stat_labels} />
      </div>

      {Object.keys(data.by_year).length > 0 && (
        <div className="rounded-2xl bg-card p-5">
          <p className="mb-3 text-sm text-muted">Year by year</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.by_year).reverse().map(([year, name]) => (
              <span key={year} className="rounded-full bg-card-hover px-3 py-1.5 text-sm">
                <span className="text-muted">{year}</span> {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** One row per persona: my score, with a tick where the persona starts. Best fit first. */
function Traits({ title, traits, labels }: { title: string; traits: PersonaFit[]; labels: Record<string, string> }) {
  const SCALE = 1.5; // the bar is full at 1.5x the threshold, so the tick sits at 2/3
  return (
    <div className="rounded-2xl bg-card p-5">
      <p className="mb-3 text-sm text-muted">{title} · the tick is where a persona starts</p>
      <ul className="space-y-3">
        {traits.map((t, i) => {
          const fits = t.fit >= 1;
          return (
            <li key={t.id} title={`${(t.value * 100).toFixed(1)}% ${labels[t.stat] ?? ""} (persona starts at ${(t.threshold * 100).toFixed(0)}%)`}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={i === 0 ? "font-semibold" : fits ? "" : "text-muted"}>
                  {t.title}
                  {i === 0 && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-black">me</span>}
                </span>
                <span className="tabular-nums text-muted">
                  <span className="text-foreground">{(t.value * 100).toFixed(0)}%</span> {labels[t.stat]}
                </span>
              </div>
              <div className="relative mt-1.5 h-1.5 w-full rounded-full bg-white/5">
                <div
                  className={`h-1.5 rounded-full ${i === 0 ? "bg-accent" : fits ? "bg-accent/60" : "bg-white/20"}`}
                  style={{ width: `${Math.min((t.fit / SCALE) * 100, 100)}%` }}
                />
                <span className="absolute -top-0.5 h-2.5 w-0.5 rounded bg-white/50" style={{ left: `${100 / SCALE}%` }} aria-hidden />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
