import Link from "next/link";
import { Card } from "@/components/Card";
import { RankedList } from "@/components/RankedList";
import { getMonthly, getTopArtists, getTopTracks, getYearly } from "@/lib/data";
import { MONTH_SHORT, monthLabel } from "@/lib/format";

const SHOW = 25;
// Real Spotify track IDs are 22 characters; the fake sample data's aren't, so we skip links for those.
const spotifyTrackUrl = (id?: string) => (id && id.length === 22 ? `https://open.spotify.com/track/${id}` : undefined);

// Top artists & tracks, filtered by ?period=all | 2026 | 2026-10
export default async function TopPage({ searchParams }: PageProps<"/top">) {
  const params = await searchParams;
  const [artists, tracks, yearly, monthly] = await Promise.all([getTopArtists(), getTopTracks(), getYearly(), getMonthly()]);

  const raw = typeof params.period === "string" ? params.period : "all";
  const isMonth = /^\d{4}-\d{2}$/.test(raw) && raw in artists.by_month;
  const isYear = /^\d{4}$/.test(raw) && raw in artists.by_year;
  const period = isMonth || isYear ? raw : "all";
  const selectedYear = isMonth ? raw.slice(0, 4) : isYear ? raw : null;

  const artistList = period === "all" ? artists.all_time : isMonth ? artists.by_month[period] : artists.by_year[period];
  const trackList = period === "all" ? tracks.all_time : isMonth ? tracks.by_month[period] : tracks.by_year[period];
  const title = period === "all" ? "All time" : isMonth ? monthLabel(period) : period;

  const monthsInYear = selectedYear ? monthly.filter((m) => m.month.startsWith(selectedYear)).map((m) => m.month) : [];

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm text-muted">Ranked by minutes listened</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Top artists & tracks · {title}</h1>
      </section>

      {/* Filters: one row for the period, a second row for months of the chosen year */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Chip href="/top" active={period === "all"}>All time</Chip>
          {[...yearly].reverse().map((y) => (
            <Chip key={y.year} href={`/top?period=${y.year}`} active={selectedYear === String(y.year)}>{y.year}</Chip>
          ))}
          <span className="rounded-full border border-white/10 px-4 py-1.5 text-sm text-muted/60" title="Coming once genre data is added">
            Genre · soon
          </span>
        </div>
        {selectedYear && (
          <div className="flex flex-wrap gap-2">
            <Chip href={`/top?period=${selectedYear}`} active={isYear} small>Whole year</Chip>
            {monthsInYear.map((m) => (
              <Chip key={m} href={`/top?period=${m}`} active={period === m} small>{MONTH_SHORT[Number(m.slice(5)) - 1]}</Chip>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-bold">Artists</h2>
          <RankedList items={artistList.slice(0, SHOW).map((a) => ({ ...a }))} emptyText="No listening in this period." />
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-bold">Tracks</h2>
          <RankedList
            items={trackList.slice(0, SHOW).map((t) => ({ name: t.name, subtitle: t.artist, minutes: t.minutes, plays: t.plays, spotifyUrl: spotifyTrackUrl(t.track_id) }))}
            emptyText="No listening in this period."
          />
        </Card>
      </div>
    </div>
  );
}

function Chip({ href, active, small, children }: { href: string; active: boolean; small?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`rounded-full transition ${small ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm"} ${
        active ? "bg-white text-black" : "bg-card text-muted hover:bg-card-hover hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
