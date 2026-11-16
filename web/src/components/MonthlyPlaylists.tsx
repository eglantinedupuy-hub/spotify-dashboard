"use client";

import Image from "next/image";
import { useState } from "react";
import type { MonthlyPlaylist } from "@/lib/data";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type Props = { playlists: MonthlyPlaylist[]; currentMonth: number; currentYear: number };

/** My monthly playlists for one month across the years (opens on the current month). */
export function MonthlyPlaylists({ playlists, currentMonth, currentYear }: Props) {
  const [month, setMonth] = useState(currentMonth);
  const count = (m: number) => playlists.filter((p) => p.month === m).length;
  const shown = playlists.filter((p, i, all) => p.month === month && all.findIndex((q) => q.id === p.id && q.month === p.month) === i).sort((a, b) => b.year - a.year);
  const inProgress = (p: MonthlyPlaylist) => p.year === currentYear && p.month === currentMonth;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="tablist">
        {MONTHS.map((name, i) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={month === i + 1}
            onClick={() => setMonth(i + 1)}
            disabled={count(i + 1) === 0}
            className={`rounded-full px-3 py-1.5 text-sm transition disabled:opacity-30 ${
              month === i + 1 ? "bg-white text-black" : "bg-card text-muted hover:bg-card-hover hover:text-foreground"
            }`}
          >
            {name.slice(0, 3)}
            {i + 1 === currentMonth && <span className="ml-1 text-accent">•</span>}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-muted">No {MONTHS[month - 1]} playlists yet.</p>
      ) : (
        <div key={month} className="grid animate-[fade_300ms_ease-out] grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((p) => (
            <a
              key={`${p.id}-${p.month}`}
              href={p.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl bg-card p-3 transition hover:-translate-y-0.5 hover:bg-card-hover"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-card-hover">
                {p.image ? (
                  <Image src={p.image} alt={`Cover of ${p.name}`} fill sizes="(min-width: 1024px) 25vw, 50vw" unoptimized className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl text-muted">♪</div>
                )}
                <span className="absolute bottom-2 right-2 flex h-10 w-10 translate-y-1 items-center justify-center rounded-full bg-accent text-black opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100" aria-hidden>
                  ▶
                </span>
              </div>
              <p className="mt-3 flex items-center gap-2 font-semibold">
                <span className="truncate">{p.name}</span>
                {inProgress(p) && <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-black">Now</span>}
              </p>
              <p className="text-sm text-muted">
                {p.year}
                {p.tracks != null && ` · ${p.tracks} songs`}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
