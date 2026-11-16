import Image from "next/image";
import { Card } from "@/components/Card";
import { UnplayedExplorer } from "@/components/UnplayedExplorer";
import { canExport } from "@/lib/canExport";
import { getLibrary } from "@/lib/data";

export default async function LibraryPage() {
  const lib = await getLibrary();
  if (!lib.liked_total) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Saved but never played</h1>
        <Card><p className="text-muted">No data yet — run <code>python pipeline/spotify_fetch.py</code> then <code>python pipeline/library_check.py</code>.</p></Card>
      </div>
    );
  }
  const never = lib.liked_never_played;
  const pct = Math.round((never.length / lib.liked_total) * 100);
  const playlistSongs = lib.playlist_unplayed ?? [];
  const playlistNever = playlistSongs.filter((t) => t.plays === 0).length;
  const barelyPlaylists = lib.playlists_barely_listened ?? [];

  return (
    <div className="space-y-10">
      <section>
        <p className="text-sm text-muted">Liked songs, my playlists and followed artists vs my whole listening history (a play = 30+ seconds)</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Saved but never played</h1>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Liked, never played</p>
          <p className="mt-2 text-3xl font-bold sm:text-4xl">{never.length}</p>
          <p className="mt-1 text-xs text-muted">{pct}% of my {lib.liked_total.toLocaleString("en-US")} liked songs</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Liked, played only once or twice</p>
          <p className="mt-2 text-3xl font-bold sm:text-4xl">{lib.liked_barely_played.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">In my playlists, never played</p>
          <p className="mt-2 text-3xl font-bold sm:text-4xl">{playlistNever.toLocaleString("en-US")}</p>
          <p className="mt-1 text-xs text-muted">across the {lib.playlists_read ?? 0} playlists I own or collaborate on</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Playlists I’ve barely listened to</p>
          <p className="mt-2 text-3xl font-bold sm:text-4xl">{barelyPlaylists.length}</p>
          <p className="mt-1 text-xs text-muted">fewer than half their songs played {lib.barely ?? 3}+ times</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Followed artists I barely listen to</p>
          <p className="mt-2 text-3xl font-bold sm:text-4xl">{lib.followed_barely_listened.length}</p>
          <p className="mt-1 text-xs text-muted">under 10 minutes, of {lib.followed_total} followed</p>
        </Card>
      </div>

      <UnplayedExplorer liked={[...never, ...lib.liked_barely_played]} inPlaylists={playlistSongs} canExport={canExport} />

      {barelyPlaylists.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">Playlists I’ve barely listened to</h2>
            <p className="text-sm text-muted">Share of each playlist’s songs I’ve played {lib.barely ?? 3}+ times (anywhere — Spotify doesn’t record which playlist a play came from)</p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {barelyPlaylists.slice(0, 24).map((p) => (
              <a key={p.id} href={p.url ?? "#"} target="_blank" rel="noopener noreferrer" className="group rounded-2xl bg-card p-3 transition hover:-translate-y-0.5 hover:bg-card-hover">
                <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-card-hover">
                  {p.image && <Image src={p.image} alt="" fill sizes="200px" unoptimized className="object-cover" />}
                </div>
                <p className="mt-2 truncate text-sm font-semibold">{p.name}</p>
                <p className="text-xs text-muted">{p.played_pct.toFixed(0)}% of {p.tracks} songs played</p>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/5">
                  <div className="h-1.5 rounded-full bg-accent" style={{ width: `${Math.max(p.played_pct, 2)}%` }} />
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {lib.followed_barely_listened.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Followed artists I barely listen to</h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {lib.followed_barely_listened.slice(0, 40).map((a) => (
              <a key={a.id} href={a.url ?? "#"} target="_blank" rel="noopener noreferrer" className="group text-center">
                <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full bg-card-hover">
                  {a.image && <Image src={a.image} alt={a.name} fill sizes="120px" unoptimized className="object-cover transition group-hover:scale-105" />}
                </div>
                <p className="mt-2 truncate text-sm font-semibold">{a.name}</p>
                <p className="text-xs text-muted">{a.minutes ? `${Math.round(a.minutes)} min` : "never"}</p>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
