"use client";

import { useMemo, useState } from "react";
import type { Genres } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import { genreShares } from "@/lib/genres";

type Props = { data: Genres; years: number[]; recentMonths: string[] };

const spotifyTrackUrl = (id?: string | null) => (id && id.length === 22 ? `https://open.spotify.com/track/${id}` : undefined);

/** Genre breakdown for a chosen period (bars), plus the top artists & songs of the genre you click. */
export function GenresView({ data, years, recentMonths }: Props) {
  const [period, setPeriod] = useState<string>("all"); // "all" | "recent" | "2024"
  const [selected, setSelected] = useState<string | null>(null);

  const [openElectronic, setOpenElectronic] = useState(true);

  const { rows, subRows } = useMemo(() => {
    const months = Object.keys(data.by_month).filter(
      (m) => period === "all" || (period === "recent" ? recentMonths.includes(m) : m.startsWith(period)),
    );
    const s = genreShares(data, months);
    const toRows = (d: Record<string, number>) =>
      Object.entries(d)
        .map(([genre, minutes]) => ({ genre, minutes, pct: (minutes / s.classified) * 100 }))
        .sort((a, b) => b.minutes - a.minutes);
    return { rows: toRows(s.minutes), subRows: toRows(s.sub) };
  }, [data, period, recentMonths]);

  const max = rows[0]?.minutes || 1;
  const active = selected ?? rows[0]?.genre ?? null;
  // top lists exist for "all" and each year; "recent" uses the current year's
  const topKey = period === "recent" ? String(years[years.length - 1]) : period;
  const top = active ? data.top_by_genre[active]?.[topKey] : undefined;

  const bar = (r: { genre: string; minutes: number; pct: number }, scale: number, small = false) => (
    <button
      type="button"
      onClick={() => setSelected(r.genre)}
      className={`w-full rounded-xl px-2 ${small ? "py-1.5" : "py-2"} text-left transition hover:bg-card-hover ${active === r.genre ? "bg-card-hover" : ""}`}
    >
      <div className={`flex items-baseline justify-between gap-3 ${small ? "text-xs" : "text-sm"}`}>
        <span className={small ? "" : "font-semibold"}>{r.genre}</span>
        <span className="tabular-nums text-muted">
          <span className="text-foreground">{r.pct.toFixed(1)}%</span> · {formatNumber(r.minutes)} min
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/5">
        <div className={`h-1.5 rounded-full ${active === r.genre ? "bg-accent" : "bg-accent/60"}`} style={{ width: `${Math.max((r.minutes / scale) * 100, 1.5)}%` }} />
      </div>
    </button>
  );

  const chip = (id: string, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => { setPeriod(id); setSelected(null); }}
      className={`rounded-full px-3 py-1.5 text-sm transition ${period === id ? "bg-white text-black" : "bg-card text-muted hover:bg-card-hover hover:text-foreground"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {chip("all", "All time")}
        {chip("recent", "Last 3 months")}
        {[...years].reverse().map((y) => chip(String(y), String(y)))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Breakdown */}
        <div className="rounded-2xl bg-card p-5 lg:col-span-3">
          <p className="mb-3 text-sm text-muted">Share of my listening time · click a genre</p>
          <ul className="space-y-1">
            {rows.map((r) => (
              <li key={r.genre}>
                {bar(r, max)}
                {r.genre === "Electronic" && subRows.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setOpenElectronic((o) => !o)}
                      className="ml-2 mt-1 text-xs text-muted hover:text-foreground"
                    >
                      {openElectronic ? "▾ Hide styles" : `▸ Show ${subRows.length} styles`}
                    </button>
                    {openElectronic && (
                      <ul className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-2">
                        {subRows.map((sr) => <li key={sr.genre}>{bar(sr, max, true)}</li>)}
                      </ul>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">French artists also count in their own genre (French rap is in French and in Rap), so shares add up to more than 100%.</p>
        </div>

        {/* Selected genre: top artists & songs */}
        <div className="rounded-2xl bg-card p-5 lg:col-span-2">
          <p className="text-sm text-muted">Top in</p>
          <p className="text-xl font-bold">{active ?? "—"}</p>
          {top ? (
            <div className="mt-4 space-y-5">
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted">Artists</p>
                <ol className="space-y-1 text-sm">
                  {top.artists.map((a, i) => (
                    <li key={a.name} className="flex justify-between gap-3">
                      <span className="truncate"><span className="text-muted">{i + 1}.</span> {a.name}</span>
                      <span className="shrink-0 tabular-nums text-muted">{formatNumber(a.minutes)} min</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted">Songs</p>
                <ol className="space-y-1 text-sm">
                  {top.tracks.map((t, i) => {
                    const url = spotifyTrackUrl(t.track_id);
                    return (
                      <li key={`${t.name}-${t.artist}`} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate">
                          <span className="text-muted">{i + 1}.</span>{" "}
                          {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{t.name}</a> : t.name}
                          <span className="text-muted"> · {t.artist}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-muted">{formatNumber(t.minutes)}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">No data for this genre in this period.</p>
          )}
        </div>
      </div>
    </div>
  );
}
