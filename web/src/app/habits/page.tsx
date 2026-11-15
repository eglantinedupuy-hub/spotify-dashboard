import { Card } from "@/components/Card";
import { Heatmap } from "@/components/charts/Heatmap";
import { getHourWeekday, getSummary } from "@/lib/data";
import { formatNumber, hourLabel } from "@/lib/format";

const FULL_DAY = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Habits: when do I listen? (all-time, local Toronto time)
export default async function HabitsPage() {
  const [{ weekdays, minutes }, summary] = await Promise.all([getHourWeekday(), getSummary()]);

  const total = minutes.flat().reduce((a, b) => a + b, 0) || 1;
  const byDay = minutes.map((row) => row.reduce((a, b) => a + b, 0));
  const byHour = Array.from({ length: 24 }, (_, h) => minutes.reduce((sum, row) => sum + row[h], 0));
  const busiestDay = byDay.indexOf(Math.max(...byDay));
  const busiestHour = byHour.indexOf(Math.max(...byHour));
  // "Night owl": share of listening between 10 PM and 4 AM
  const night = byHour.filter((_, h) => h >= 22 || h < 4).reduce((a, b) => a + b, 0);
  const weekend = byDay[5] + byDay[6];

  const tiles = [
    { label: "Busiest day", value: FULL_DAY[busiestDay], note: `${Math.round((byDay[busiestDay] / total) * 100)}% of my listening` },
    { label: "Busiest hour", value: hourLabel(busiestHour), note: `${formatNumber(byHour[busiestHour])} min all-time` },
    { label: "Night owl score", value: `${Math.round((night / total) * 100)}%`, note: "of listening between 10 PM and 4 AM" },
    { label: "Weekend share", value: `${Math.round((weekend / total) * 100)}%`, note: "of listening on Sat & Sun (29% would be even)" },
  ];

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm text-muted">All-time, {summary.first_play} to {summary.last_play} · Toronto time</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Listening habits</h1>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <p className="text-sm text-muted">{t.label}</p>
            <p className="mt-2 text-2xl font-bold sm:text-3xl">{t.value}</p>
            <p className="mt-1 text-xs text-muted">{t.note}</p>
          </Card>
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">When I listen</h2>
        <Card>
          <Heatmap weekdays={weekdays} minutes={minutes} />
        </Card>
      </section>
    </div>
  );
}
