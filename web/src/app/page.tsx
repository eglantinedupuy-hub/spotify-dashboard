import { StatCard } from "@/components/StatCard";
import { TopItemCard } from "@/components/TopItemCard";
import { Card } from "@/components/Card";
import { MinutesPerYearChart } from "@/components/charts/MinutesPerYearChart";
import { getDaily, getMonthly, getSummary, getTopArtists, getTopTracks, getYearly } from "@/lib/data";
import { formatNumber, monthLabel, percentChange } from "@/lib/format";

// Overview: "this month" and "this year" at a glance.
// "This month" = the latest month in the data (until live daily refresh exists).
export default async function OverviewPage() {
  const [summary, daily, monthly, yearly, topArtists, topTracks] = await Promise.all([
    getSummary(), getDaily(), getMonthly(), getYearly(), getTopArtists(), getTopTracks(),
  ]);

  // --- This month ---
  const lastDate = summary.last_play; // e.g. "2026-11-09"
  const thisMonthKey = lastDate.slice(0, 7); // "2026-11"
  const [year, month] = thisMonthKey.split("-").map(Number);
  const sameMonthLastYearKey = `${year - 1}-${String(month).padStart(2, "0")}`;
  const thisMonth = monthly.find((m) => m.month === thisMonthKey);
  const lastYearMonth = monthly.find((m) => m.month === sameMonthLastYearKey);
  const monthTopArtist = topArtists.by_month[thisMonthKey]?.[0];
  const monthTopTrack = topTracks.by_month[thisMonthKey]?.[0];

  // Compare the month so far with the same days of that month last year (fair comparison mid-month).
  const dayOfMonth = lastDate.slice(8, 10);
  const lastYearMonthSoFar = daily
    .filter((d) => d.date.startsWith(sameMonthLastYearKey) && d.date.slice(8, 10) <= dayOfMonth)
    .reduce((sum, d) => sum + d.minutes, 0);

  // --- This year ---
  const thisYear = yearly.find((y) => y.year === year);
  const yearTopArtist = topArtists.by_year[String(year)]?.[0];
  const yearTopTrack = topTracks.by_year[String(year)]?.[0];
  // Same point last year: total minutes from Jan 1 to the same month/day last year.
  const sameDateLastYear = `${year - 1}${lastDate.slice(4)}`;
  const lastYearSoFar = daily
    .filter((d) => d.date.startsWith(String(year - 1)) && d.date <= sameDateLastYear)
    .reduce((sum, d) => sum + d.minutes, 0);

  return (
    <div className="space-y-10">
      <section>
        <p className="text-sm text-muted">
          Data from {summary.first_play} to {summary.last_play} · {formatNumber(summary.total_minutes)} minutes in total
        </p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">My listening</h1>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">This month · {monthLabel(thisMonthKey)}</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Minutes listened"
            value={thisMonth?.minutes ?? 0}
            unit="min"
            change={percentChange(thisMonth?.minutes ?? 0, lastYearMonthSoFar || lastYearMonth?.minutes)}
            changeLabel={`vs ${monthLabel(sameMonthLastYearKey)}`}
            href="/over-time"
          />
          <StatCard label="Plays" value={thisMonth?.plays ?? 0} href="/over-time" />
          <TopItemCard label="Top artist" name={monthTopArtist?.name} minutes={monthTopArtist?.minutes} href={`/top?period=${thisMonthKey}`} />
          <TopItemCard
            label="Top track"
            name={monthTopTrack?.name}
            subtitle={monthTopTrack?.artist}
            minutes={monthTopTrack?.minutes}
            href={`/top?period=${thisMonthKey}`}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">This year · {year}</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Minutes listened"
            value={thisYear?.minutes ?? 0}
            unit="min"
            change={percentChange(thisYear?.minutes ?? 0, lastYearSoFar)}
            changeLabel={`vs same date in ${year - 1}`}
            href="/over-time"
          />
          <StatCard label="Different artists" value={thisYear?.unique_artists ?? 0} href={`/top?period=${year}`} />
          <TopItemCard label="Top artist" name={yearTopArtist?.name} minutes={yearTopArtist?.minutes} href={`/top?period=${year}`} />
          <TopItemCard
            label="Top track"
            name={yearTopTrack?.name}
            subtitle={yearTopTrack?.artist}
            minutes={yearTopTrack?.minutes}
            href={`/top?period=${year}`}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Minutes per year</h2>
        <Card>
          <MinutesPerYearChart data={yearly.map((y) => ({ year: y.year, minutes: y.minutes }))} highlightYear={year} />
        </Card>
      </section>
    </div>
  );
}
