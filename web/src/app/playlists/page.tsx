import { connection } from "next/server";
import { MonthlyPlaylists } from "@/components/MonthlyPlaylists";
import { getSpotifyApi } from "@/lib/data";

export default async function PlaylistsPage() {
  await connection(); // render on each visit so it opens on the real current month
  const api = await getSpotifyApi();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date()); // YYYY-MM-DD
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm text-muted">
          {api.monthly_playlists.length} monthly playlists
          {api.fetched_at && ` · updated ${api.fetched_at.slice(0, 10)}`}
        </p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Monthly playlists</h1>
        <p className="mt-2 text-muted">What I was playing this time of year, in years past.</p>
      </section>
      {api.monthly_playlists.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-muted">
          No playlists yet — run <code>python pipeline/spotify_fetch.py</code>.
        </p>
      ) : (
        <MonthlyPlaylists playlists={api.monthly_playlists} currentMonth={month} currentYear={year} />
      )}
    </div>
  );
}
