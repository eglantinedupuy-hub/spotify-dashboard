import { Card } from "@/components/Card";
import { StatCard } from "@/components/StatCard";
import { ListeningOverTimeChart } from "@/components/charts/ListeningOverTimeChart";
import { YearRaceChart } from "@/components/charts/YearRaceChart";
import { getDaily, getMonthly, getSummary, getYearly } from "@/lib/data";
import { MONTH_SHORT, formatNumber } from "@/lib/format";

// Day index within a leap year, so Feb 29 lines up across all years. "2026-03-01" -> 60
const DAYS_BEFORE_MONTH = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const dayIndex = (date: string) => DAYS_BEFORE_MONTH[Number(date.slice(5, 7)) - 1] + Number(date.slice(8, 10)) - 1;
const indexLabel = (i: number) => {
  const m = DAYS_BEFORE_MONTH.findLastIndex((start) => start <= i);
  return `${MONTH_SHORT[m]} ${i - DAYS_BEFORE_MONTH[m] + 1}`;
};

export default async function OverTimePage() {
  const [daily, monthly, yearly, summary] = await Promise.all([getDaily(), getMonthly(), getYearly(), getSummary()]);
  const years = yearly.map((y) => y.year);
  const currentYear = Number(summary.last_play.slice(0, 4));
  const lastIndex = dayIndex(summary.last_play);

  // --- Cumulative minutes by day of year, one series per year ("Wrapped record" race) ---
  const perDay: Record<number, number[]> = Object.fromEntries(years.map((y) => [y, new Array(366).fill(0)]));
  for (const d of daily) perDay[Number(d.date.slice(0, 4))][dayIndex(d.date)] += d.minutes;
  const raceRows = Array.from({ length: 366 }, (_, i) => {
    const row: Record<string, number | string | null> = { day: indexLabel(i) };
    return row;
  });
  const firstYear = Number(summary.first_play.slice(0, 4));
  const firstIndex = dayIndex(summary.first_play);
  for (const y of years) {
    let running = 0;
    for (let i = 0; i < 366; i++) {
      running += perDay[y][i];
      // no line before my data starts (first year) or after the last day with data (current year)
      const beforeData = y === firstYear && i < firstIndex;
      const afterData = y === currentYear && i > lastIndex;
      raceRows[i][String(y)] = beforeData || afterData ? null : Math.round(running);
    }
  }
  const monthTicks = MONTH_SHORT.map((m) => `${m} 1`);

  // --- Minutes per month, one line per year (Jan..Dec) ---
  const monthRows = MONTH_SHORT.map((label, i) => {
    const row: Record<string, number | string | null> = { month: label };
    for (const y of years) {
      const key = `${y}-${String(i + 1).padStart(2, "0")}`;
      const m = monthly.find((x) => x.month === key);
      // leave out the month in progress — a half month would look like a big drop
      row[String(y)] = m && key !== summary.last_play.slice(0, 7) ? m.minutes : null;
    }
    return row;
  });

  // --- Record tracker ---
  const thisYearSoFar = yearly.find((y) => y.year === currentYear)?.minutes ?? 0;
  const pastYears = yearly.filter((y) => y.year < currentYear);
  const record = pastYears.reduce<(typeof pastYears)[number] | null>((best, y) => (!best || y.minutes > best.minutes ? y : best), null);
  const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  // days elapsed this year (convert leap-calendar index back to a real day count)
  // Line charts: the last 5 years plus my record year, so the chart stays readable
  const chartYears = years.filter((y) => y >= currentYear - 4 || y === record?.year);
  const daysElapsed = lastIndex + 1 - (!isLeap(currentYear) && lastIndex >= 59 ? 1 : 0);
  const daysInYear = isLeap(currentYear) ? 366 : 365;
  const projected = (thisYearSoFar / daysElapsed) * daysInYear;
  // Put big minute totals in human terms: days of non-stop listening and share of the time that passed
  const nonStop = (min: number) => {
    const days = min / 1440;
    return days >= 60 ? `≈ ${(days / 30.44).toFixed(1)} months non-stop` : `≈ ${Math.round(days)} days non-stop`;
  };
  const shareOf = (min: number, days: number) => `${((min / (days * 1440)) * 100).toFixed(1)}%`;
  const soFarNote = `${nonStop(thisYearSoFar)} · ${shareOf(thisYearSoFar, daysElapsed)} of the year so far`;
  const recordNote = record
    ? `${nonStop(record.minutes)} · ${shareOf(record.minutes, isLeap(record.year) ? 366 : 365)} of ${record.year}`
    : "";

  return (
    <div className="space-y-10">
      <section>
        <p className="text-sm text-muted">{summary.first_play} to {summary.last_play}</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Listening over time</h1>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Minutes listened</h2>
        <Card>
          <ListeningOverTimeChart daily={daily} monthly={monthly} yearly={yearly} />
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Race to my record</h2>
          <p className="text-sm text-muted">Running total of minutes through each year (last 5 years + my record year).</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <StatCard label={`${currentYear} so far`} value={thisYearSoFar} unit="min" note={soFarNote} />
          <StatCard label={`Projected ${currentYear} total`} value={projected} unit="min" />
          {record ? (
            <StatCard
              label={`Record · ${record.year}`}
              value={record.minutes}
              unit="min"
              change={((projected - record.minutes) / record.minutes) * 100}
              changeLabel="projected vs record"
              note={recordNote}
            />
          ) : (
            <Card><p className="text-sm text-muted">No earlier year to compare yet.</p></Card>
          )}
        </div>
        <Card>
          <YearRaceChart rows={raceRows} xKey="day" years={chartYears} currentYear={currentYear} ticks={monthTicks} />
        </Card>
        {record && (
          <p className="text-sm text-muted">
            At this pace I’ll finish {currentYear} with about <span className="text-foreground">{formatNumber(projected)}</span> minutes —{" "}
            {projected >= record.minutes ? "a new record." : `${formatNumber(record.minutes - projected)} short of my ${record.year} record.`}
          </p>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Month by month, year vs year</h2>
          <p className="text-sm text-muted">The current month appears once it’s complete.</p>
        </div>
        <Card>
          <YearRaceChart rows={monthRows} xKey="month" years={chartYears} currentYear={currentYear} />
        </Card>
      </section>
    </div>
  );
}
