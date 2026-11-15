import Image from "next/image";
import { Card } from "./Card";
import type { SpotifyApi } from "@/lib/data";

/** "Right now" from the Spotify API: top artists of the last 4 weeks + latest plays. Hidden if there's no API data. */
export function RightNow({ api }: { api: SpotifyApi }) {
  const artists = (api.top.artists.short_term ?? []).slice(0, 6);
  const recent = api.recent.slice(0, 5);
  if (!artists.length && !recent.length) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Right now</h2>
        <p className="text-sm text-muted">From Spotify, last 4 weeks · updated {api.fetched_at?.slice(0, 10)}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <p className="mb-4 text-sm text-muted">Top artists</p>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {artists.map((a, i) => (
              <a key={a.id} href={a.url ?? "#"} target="_blank" rel="noopener noreferrer" className="group text-center">
                <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full bg-card-hover">
                  {a.image && <Image src={a.image} alt={a.name} fill sizes="120px" unoptimized className="object-cover transition group-hover:scale-105" />}
                </div>
                <p className="mt-2 truncate text-sm font-semibold">
                  <span className="text-muted">{i + 1}.</span> {a.name}
                </p>
              </a>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <p className="mb-3 text-sm text-muted">Recently played</p>
          <ul className="space-y-2">
            {recent.map((t) => (
              <li key={`${t.id}-${t.played_at}`}>
                <a href={t.url ?? "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg p-1 transition hover:bg-card-hover">
                  {t.image && <Image src={t.image} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded" />}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{t.name}</span>
                    <span className="block truncate text-xs text-muted">{t.artists.join(", ")}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}
