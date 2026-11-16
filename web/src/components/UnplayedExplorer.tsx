"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { LibraryTrack } from "@/lib/data";

type Props = {
  liked: LibraryTrack[]; // liked songs played < 3 times
  inPlaylists: LibraryTrack[]; // songs in my playlists played < 3 times
  canExport: boolean; // only true when the site runs on my computer
};

type Song = LibraryTrack & { sources: ("liked" | "playlists")[] };

const SHOW = 48;

// how I treat a song when it comes on (starts = any length, skips = stopped before 30 s)
const SKIP_GROUPS = [
  { id: "unheard", label: "Never heard" },
  { id: "never", label: "Never skipped" },
  { id: "rarely", label: "Rarely skipped" },
  { id: "often", label: "Often skipped" },
  { id: "always", label: "Always skipped" },
] as const;
type SkipGroup = (typeof SKIP_GROUPS)[number]["id"];
function skipGroup(t: LibraryTrack): SkipGroup {
  const starts = t.starts ?? 0, skips = t.skips ?? 0;
  if (!starts) return "unheard";
  if (!skips) return "never";
  if (skips >= starts) return "always";
  return skips / starts < 0.5 ? "rarely" : "often";
}
const SIZES = [25, 50, 100, 250, 0]; // 0 = all

/** Filter my never/barely played songs, preview them, and (locally) export them to a new Spotify playlist. */
export function UnplayedExplorer({ liked, inPlaylists, canExport }: Props) {
  // one list, one entry per song, remembering where it came from
  const songs = useMemo(() => {
    const map = new Map<string, Song>();
    for (const t of liked) map.set(t.id, { ...t, sources: ["liked"] });
    for (const t of inPlaylists) {
      const prev = map.get(t.id);
      if (prev) map.set(t.id, { ...prev, playlists: t.playlists, sources: ["liked", "playlists"] });
      else map.set(t.id, { ...t, sources: ["playlists"] });
    }
    return [...map.values()];
  }, [liked, inPlaylists]);

  const genreOptions = useMemo(() => {
    const count = new Map<string, number>();
    const add = (g?: string | null) => g && count.set(g, (count.get(g) ?? 0) + 1);
    for (const s of songs) {
      add(s.genre);
      add(s.style);
      if (s.french && s.genre !== "French") add("French");
    }
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
  }, [songs]);
  const years = useMemo(
    () => [...new Set(songs.map((s) => s.added_at?.slice(0, 4)).filter(Boolean) as string[])].sort().reverse(),
    [songs],
  );

  const [sources, setSources] = useState<string[]>(["liked", "playlists"]);
  const [plays, setPlays] = useState<"never" | "barely" | "both">("never");
  const [genres, setGenres] = useState<string[]>([]);
  const [skipFilter, setSkipFilter] = useState<string[]>([]);
  const [addedYears, setAddedYears] = useState<string[]>([]);
  const [size, setSize] = useState(50);
  const [order, setOrder] = useState<"newest" | "oldest" | "shuffle">("newest");
  const [seed, setSeed] = useState(1);

  const filtered = useMemo(() => {
    const list = songs.filter(
      (s) =>
        s.sources.some((src) => sources.includes(src)) &&
        (plays === "both" || (plays === "never" ? s.plays === 0 : s.plays > 0)) &&
        (!genres.length || genres.some((g) => s.genre === g || s.style === g || (g === "French" && s.french))) &&
        (!addedYears.length || addedYears.includes(s.added_at?.slice(0, 4) ?? "")) &&
        (!skipFilter.length || skipFilter.includes(skipGroup(s))),
    );
    if (order === "shuffle") {
      // seeded shuffle, so the preview and the export are the same songs
      let x = seed * 9301 + 49297;
      const rand = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
      return list.map((s) => ({ s, k: rand() })).sort((a, b) => a.k - b.k).map((o) => o.s);
    }
    const dir = order === "newest" ? -1 : 1;
    return list.sort((a, b) => dir * (a.added_at ?? "").localeCompare(b.added_at ?? ""));
  }, [songs, sources, plays, genres, addedYears, skipFilter, order, seed]);
  const picked = size ? filtered.slice(0, size) : filtered;

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const chip = (on: boolean, label: string, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full px-3 py-1.5 text-sm transition ${on ? "bg-white text-black" : "bg-card-hover text-muted hover:text-foreground"}`}
    >
      {label}
    </button>
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Find songs to (finally) listen to</h2>
        <p className="text-sm text-muted">Liked songs and songs in my playlists that I’ve never or barely played. Filter, then {canExport ? "turn them into a playlist" : "browse"}.</p>
      </div>

      <div className="space-y-3 rounded-2xl bg-card p-5">
        <Row label="From">
          {chip(sources.includes("liked"), `Liked songs (${liked.length})`, () => toggle(sources, setSources, "liked"))}
          {chip(sources.includes("playlists"), `My playlists (${inPlaylists.length})`, () => toggle(sources, setSources, "playlists"))}
        </Row>
        <Row label="Played">
          {chip(plays === "never", "Never", () => setPlays("never"))}
          {chip(plays === "barely", "Once or twice", () => setPlays("barely"))}
          {chip(plays === "both", "Either", () => setPlays("both"))}
        </Row>
        <Row label="Skips">
          {chip(!skipFilter.length, "Any", () => setSkipFilter([]))}
          {SKIP_GROUPS.map((g) => chip(skipFilter.includes(g.id), g.label, () => toggle(skipFilter, setSkipFilter, g.id)))}
        </Row>
        {genreOptions.length > 0 && (
          <Row label="Genre">
            {chip(!genres.length, "Any", () => setGenres([]))}
            {genreOptions.map((g) => chip(genres.includes(g), g, () => toggle(genres, setGenres, g)))}
          </Row>
        )}
        <Row label="Added in">
          {chip(!addedYears.length, "Any year", () => setAddedYears([]))}
          {years.map((y) => chip(addedYears.includes(y), y, () => toggle(addedYears, setAddedYears, y)))}
        </Row>
        <Row label="Order">
          {chip(order === "newest", "Newest first", () => setOrder("newest"))}
          {chip(order === "oldest", "Oldest first", () => setOrder("oldest"))}
          {chip(order === "shuffle", "Shuffle", () => { setOrder("shuffle"); setSeed((s) => s + 1); })}
        </Row>
        <Row label="How many">
          {SIZES.map((n) => chip(size === n, n ? String(n) : "All", () => setSize(n)))}
        </Row>
      </div>

      <p className="text-sm text-muted">
        <span className="text-foreground">{filtered.length.toLocaleString("en-US")}</span> songs match
        {size > 0 && filtered.length > size && <> · taking {size}</>}
      </p>

      {canExport && <ExportBox songs={picked} />}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {picked.slice(0, SHOW).map((t) => (
          <a key={t.id} href={t.url ?? "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-card p-2 transition hover:bg-card-hover">
            {t.image ? (
              <Image src={t.image} alt="" width={48} height={48} unoptimized className="h-12 w-12 shrink-0 rounded" />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded bg-card-hover" />
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{t.name}</span>
              <span className="block truncate text-xs text-muted">
                {t.artists.join(", ")}
                {t.style ?? t.genre ? ` · ${t.style ?? t.genre}` : ""}
                {t.plays > 0 && ` · ${t.plays}×`}
                {(t.skips ?? 0) > 0 && ` · skipped ${t.skips}×`}
              </span>
              <span className="block truncate text-xs text-muted">
                {t.sources.includes("liked") ? "Liked" : ""}
                {t.sources.length === 2 ? " · " : ""}
                {t.playlists?.length ? `in ${t.playlists.slice(0, 2).join(", ")}${t.playlists.length > 2 ? ` +${t.playlists.length - 2}` : ""}` : ""}
              </span>
            </span>
          </a>
        ))}
      </div>
      {picked.length > SHOW && <p className="text-sm text-muted">Showing {SHOW} of {picked.length}.</p>}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-xs uppercase tracking-wide text-muted">{label}</span>
      {children}
    </div>
  );
}

/** Name + button that creates the playlist through the local-only API route. */
function ExportBox({ songs }: { songs: Song[] }) {
  const [name, setName] = useState("Never played");
  const [isPublic, setIsPublic] = useState(false);
  const [state, setState] = useState<{ status: "idle" | "busy" | "done" | "error"; msg?: string; url?: string }>({ status: "idle" });

  async function create() {
    setState({ status: "busy" });
    try {
      const r = await fetch("/api/export-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, trackIds: songs.map((s) => s.id), public: isPublic, description: "Songs I saved but never played — made with my listening dashboard" }),
      });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error ?? `Error ${r.status}`);
      setState({ status: "done", url: res.url, msg: `Added ${res.added} songs.` });
    } catch (e) {
      setState({ status: "error", msg: e instanceof Error ? e.message : "Something went wrong." });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-accent/30 bg-card p-4">
      <span className="text-xs uppercase tracking-wide text-accent">Only on my computer</span>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Playlist name"
        className="min-w-48 flex-1 rounded-full bg-card-hover px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Public
      </label>
      <button
        type="button"
        onClick={create}
        disabled={state.status === "busy" || !songs.length || !name.trim()}
        className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
      >
        {state.status === "busy" ? "Creating…" : `Create playlist (${songs.length})`}
      </button>
      {state.status === "done" && (
        <p className="w-full text-sm text-accent">
          {state.msg} {state.url && <a href={state.url} target="_blank" rel="noopener noreferrer" className="underline">Open in Spotify →</a>}
        </p>
      )}
      {state.status === "error" && <p className="w-full text-sm text-negative">{state.msg}</p>}
    </div>
  );
}
