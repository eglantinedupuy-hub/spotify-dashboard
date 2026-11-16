"""
"Saved but never played": compare what I've saved on Spotify (from spotify_fetch.py) with my full
listening history (the export in data/raw/).

Usage (from the project root, after spotify_fetch.py and, for genre filters, lastfm_genres.py):
    python pipeline/library_check.py

Writes data/processed/library.json:
  - liked songs I've never played (or played fewer than 3 times), newest likes first
  - songs in my own playlists I've never played (or barely), with the playlists they're in
  - my playlists I've barely listened to (most of their songs hardly played)
  - followed artists I've (almost) never listened to
Each song carries its artist's genre (from the Last.fm tags cache) so the site can filter before exporting.
A "play" = at least 30 seconds, same as the rest of the dashboard.
Note: my Spotify export doesn't say which playlist a song was played from, so "barely listened playlists"
means playlists whose songs I've hardly played anywhere.
"""

import json
from collections import Counter, defaultdict
from pathlib import Path

from process_export import PLAY_THRESHOLD_MS, load_plays

ROOT = Path(__file__).resolve().parent.parent
SAVED = ROOT / "data" / "raw" / "cache" / "saved_library.json"
TAGS = ROOT / "data" / "raw" / "cache" / "lastfm_tags.json"
OUT = ROOT / "data" / "processed" / "library.json"
BARELY = 3  # fewer plays than this = "barely played"
MAX_PLAYLIST_SONGS = 2500  # keep library.json a reasonable size
MIN_PLAYLIST_SIZE = 5  # ignore tiny playlists in "barely listened playlists"


def norm(s: str) -> str:
    return (s or "").strip().lower()


def genre_lookup():
    """artist -> {"g", "sub", "fr"} from the Last.fm cache (empty if lastfm_genres.py hasn't run)."""
    if not TAGS.exists():
        return {}
    from lastfm_genres import classify  # only needed when the cache exists
    cache = json.loads(TAGS.read_text(encoding="utf-8"))
    return {norm(a): c for a, tags in cache.items() if (c := classify(tags))}


def main():
    if not SAVED.exists():
        raise SystemExit("Run python pipeline/spotify_fetch.py first (it saves your liked songs).")
    saved = json.loads(SAVED.read_text(encoding="utf-8"))
    plays = load_plays(ROOT / "data" / "raw")
    genres = genre_lookup()

    by_id, by_name, artist_minutes = Counter(), Counter(), defaultdict(float)
    # every start of a song, and the ones I skipped (stopped before 30 s), for the skip filter
    starts_id, starts_name, skips_id, skips_name = Counter(), Counter(), Counter(), Counter()
    last_played = {}
    for p in plays:
        artist_minutes[norm(p["artist"])] += p["ms"] / 60_000
        key = (norm(p["track"]), norm(p["artist"]))
        starts_name[key] += 1
        if p["track_id"]:
            starts_id[p["track_id"]] += 1
        if p["ms"] < PLAY_THRESHOLD_MS:
            skips_name[key] += 1
            if p["track_id"]:
                skips_id[p["track_id"]] += 1
            continue
        key = (norm(p["track"]), norm(p["artist"]))
        by_name[key] += 1  # the same song can have several IDs (single vs album), so also match by name
        last_played[key] = p["local"].date().isoformat()
        if p["track_id"]:
            by_id[p["track_id"]] += 1

    def song_key(t):
        return (norm(t["name"]), norm(t["artists"][0] if t["artists"] else ""))

    def plays_of(t):
        return max(by_id.get(t["id"], 0), by_name.get(song_key(t), 0))

    def with_stats(t):
        g = genres.get(norm(t["artists"][0] if t["artists"] else ""), {})
        k = song_key(t)
        by_name_more = starts_name.get(k, 0) >= starts_id.get(t["id"], 0)
        starts = starts_name.get(k, 0) if by_name_more else starts_id.get(t["id"], 0)
        skips = skips_name.get(k, 0) if by_name_more else skips_id.get(t["id"], 0)
        return {**t, "plays": plays_of(t), "starts": starts, "skips": skips, "last_played": last_played.get(song_key(t)),
                "genre": g.get("g"), "style": g.get("sub"), "french": bool(g.get("fr"))}

    # 1. liked songs
    tracks = [with_stats(t) for t in saved["saved_tracks"] if plays_of(t) < BARELY]
    tracks.sort(key=lambda t: t.get("added_at") or "", reverse=True)
    liked_ids = {t["id"] for t in saved["saved_tracks"]}

    # 2. songs in my playlists (one entry per song, listing the playlists it's in)
    pl = saved.get("playlist_tracks", {})
    songs, in_playlists = {}, defaultdict(list)
    playlist_stats = []
    for pid, p in pl.items():
        n, played = 0, 0
        seen_here = set()
        for t in p["tracks"]:
            if t["id"] in seen_here:
                continue
            seen_here.add(t["id"])
            n += 1
            k = plays_of(t)
            played += k >= BARELY
            if k < BARELY:
                in_playlists[t["id"]].append(p["name"])
                prev = songs.get(t["id"])
                if not prev or (t.get("added_at") or "") > (prev.get("added_at") or ""):
                    songs[t["id"]] = t
        if n >= MIN_PLAYLIST_SIZE:
            playlist_stats.append({"id": pid, "name": p["name"], "url": p.get("url"), "image": p.get("image"),
                                   "tracks": n, "played_pct": round(played / n * 100, 1)})
    playlist_songs = [{**with_stats(t), "playlists": in_playlists[tid], "liked": tid in liked_ids} for tid, t in songs.items()]
    playlist_songs.sort(key=lambda t: (t["plays"], -(len(t["playlists"]))))  # never played first
    playlist_songs = playlist_songs[:MAX_PLAYLIST_SONGS]
    playlist_songs.sort(key=lambda t: t.get("added_at") or "", reverse=True)
    barely_playlists = sorted([p for p in playlist_stats if p["played_pct"] < 50], key=lambda p: p["played_pct"])

    # 3. followed artists
    artists = []
    for a in saved["followed_artists"]:
        minutes = round(artist_minutes.get(norm(a["name"]), 0), 1)
        if minutes < 10:
            artists.append({**a, "minutes": minutes})
    artists.sort(key=lambda a: a["minutes"])

    out = {
        "liked_total": len(saved["saved_tracks"]),
        "followed_total": len(saved["followed_artists"]),
        "playlists_read": len(pl),
        "barely": BARELY,
        "liked_never_played": [t for t in tracks if t["plays"] == 0],
        "liked_barely_played": [t for t in tracks if t["plays"] > 0],
        "playlist_unplayed": playlist_songs,
        "playlists_barely_listened": barely_playlists,
        "followed_barely_listened": artists,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    never = sum(1 for t in playlist_songs if t["plays"] == 0)
    print(f"Done: {len(out['liked_never_played'])} liked songs never played, {len(out['liked_barely_played'])} played 1-{BARELY - 1}x "
          f"(of {out['liked_total']} liked); {never} songs in my {len(pl)} playlists never played, "
          f"{len(barely_playlists)} playlists mostly unplayed; "
          f"{len(artists)} followed artists with <10 min listened (of {out['followed_total']})."
          + ("" if genres else " (No genres yet: run lastfm_genres.py first to filter by genre.)"))


if __name__ == "__main__":
    main()
