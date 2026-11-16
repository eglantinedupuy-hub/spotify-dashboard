import { Card } from "@/components/Card";
import { GenresView } from "@/components/GenresView";
import { getGenres } from "@/lib/data";
import { genreShares, percentages } from "@/lib/genres";

// left out of "Recently into": catch-alls, and the Electronic total (its subgenres are shown instead)
const NOT_TRENDS = new Set(["Other", "Electronic", "Electronic (other)"]);

export default async function GenresPage() {
  const data = await getGenres();
  const months = Object.keys(data.by_month).sort();

  if (!months.length) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Genres</h1>
        <Card><p className="text-muted">No genre data yet — run <code>python pipeline/lastfm_genres.py</code>.</p></Card>
      </div>
    );
  }

  const years = [...new Set(months.map((m) => Number(m.slice(0, 4))))];
  const recent = months.slice(-3);
  const before = months.slice(-15, -3);

  // "Recently into": share in the last 3 months vs the 12 months before
  const now = percentages(genreShares(data, recent));
  const prev = percentages(genreShares(data, before));
  const changes = Object.keys({ ...now, ...prev })
    .filter((g) => !NOT_TRENDS.has(g))
    .map((g) => ({ genre: g, now: now[g] ?? 0, delta: (now[g] ?? 0) - (prev[g] ?? 0) }))
    .sort((a, b) => b.delta - a.delta);
  const rising = changes.filter((c) => c.delta > 0.5).slice(0, 3);
  const falling = changes.filter((c) => c.delta < -0.5).slice(-3).reverse();

  // Genres over the years: yearly share for my 8 biggest genres (one small chart each)
  const allTimeShares = genreShares(data, months);
  const allTime = percentages(allTimeShares);
  const byShare = (names: string[]) => names.sort((a, b) => (allTime[b] ?? 0) - (allTime[a] ?? 0));
  const topGenres = byShare(Object.keys(allTimeShares.minutes).filter((g) => g !== "Other")).slice(0, 8);
  const topStyles = byShare(Object.keys(allTimeShares.sub).filter((g) => g !== "Electronic (other)")).slice(0, 4);
  const fullYears = years.filter((y) => months.filter((m) => m.startsWith(String(y))).length >= 3); // skip near-empty years
  const yearly = fullYears.map((y) => percentages(genreShares(data, months.filter((m) => m.startsWith(String(y))))));

  return (
    <div className="space-y-10">
      <section>
        <p className="text-sm text-muted">
          Based on <a href="https://www.last.fm" target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">Last.fm</a> artist tags · every artist I’ve played {data.min_plays}+ times ({Math.round(data.coverage * 100)}% of my listening) · one main genre each, French on top
        </p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Genres</h1>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Recently into</h2>
        <p className="-mt-2 text-sm text-muted">Last 3 months compared with the 12 months before.</p>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rising.map((c) => (
            <Card key={c.genre}>
              <p className="text-sm text-muted">More of</p>
              <p className="mt-1 text-xl font-bold">{c.genre}</p>
              <p className="mt-1 text-sm"><span className="text-accent">▲ {c.delta.toFixed(1)} pts</span> <span className="text-muted">· now {c.now.toFixed(1)}% of my listening</span></p>
            </Card>
          ))}
          {falling.map((c) => (
            <Card key={c.genre}>
              <p className="text-sm text-muted">Less of</p>
              <p className="mt-1 text-xl font-bold">{c.genre}</p>
              <p className="mt-1 text-sm"><span className="text-negative">▼ {Math.abs(c.delta).toFixed(1)} pts</span> <span className="text-muted">· now {c.now.toFixed(1)}%</span></p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Breakdown</h2>
        <GenresView data={data} years={years} recentMonths={recent} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Over the years</h2>
        <p className="-mt-2 text-sm text-muted">Share of my listening each year, {fullYears[0]}–{fullYears[fullYears.length - 1]}.</p>
        {[topGenres, topStyles].map((group, gi) => group.length > 0 && (
          <div key={gi} className="space-y-2">
            {gi === 1 && <p className="text-sm font-semibold text-muted">Electronic, by style</p>}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {group.map((g) => {
            const values = yearly.map((y) => y[g] ?? 0);
            const peak = values.indexOf(Math.max(...values));
            return (
              <Card key={g}>
                <p className="truncate text-sm font-semibold" title={g}>{g}</p>
                <p className="text-xs text-muted">
                  now {values[values.length - 1].toFixed(0)}% · peak {fullYears[peak]} ({values[peak].toFixed(0)}%)
                </p>
                <Sparkline values={values} labels={fullYears.map(String)} />
              </Card>
            );
          })}
        </div>
          </div>
        ))}
      </section>
    </div>
  );
}

/** Tiny line chart (pure SVG). Hover a point to see its value. */
function Sparkline({ values, labels }: { values: number[]; labels: string[] }) {
  const w = 200, h = 56, pad = 4;
  const max = Math.max(...values, 1);
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(values.length - 1, 1);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-14 w-full overflow-visible" role="img" aria-label={labels.map((l, i) => `${l}: ${values[i].toFixed(0)}%`).join(", ")}>
      <polyline points={points} fill="none" stroke="#1db954" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => (
        <circle key={labels[i]} cx={x(i)} cy={y(v)} r={i === values.length - 1 ? 3.5 : 2.5} fill={i === values.length - 1 ? "#1db954" : "#181818"} stroke="#1db954" strokeWidth={1.5}>
          <title>{`${labels[i]}: ${v.toFixed(1)}%`}</title>
        </circle>
      ))}
    </svg>
  );
}
