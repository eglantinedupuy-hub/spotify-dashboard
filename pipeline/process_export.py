"""
Turn Spotify streaming-history exports into small JSON summaries for the dashboard.

Usage (from the project root):
    python pipeline/process_export.py --input data/raw --out data/processed
    python pipeline/process_export.py --input pipeline/sample_data --out data/processed_sample

Reads every `Streaming_History_Audio_*.json` (extended history) found under --input.
Also accepts the basic account-data format (`StreamingHistory_music_*.json` / `StreamingHistory*.json`),
which uses `endTime`, `artistName`, `trackName`, `msPlayed` instead.

Only music plays are counted (podcast/audiobook rows have no track name).
A "play" = at least 30 seconds listened (similar to how Spotify counts streams).
Minutes = all time listened to music, including plays under 30 seconds.

Standard library only (+ `tzdata` on Windows for time zones).
"""

import argparse
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

try:
    from zoneinfo import ZoneInfo
    LOCAL_TZ = ZoneInfo("America/Toronto")
except Exception:  # tzdata missing (common on Windows) -> fall back to UTC
    ZoneInfo = None
    LOCAL_TZ = timezone.utc
    print("WARNING: time zone data not found, using UTC. Fix with: pip install tzdata")

# Each play is converted to the local time of the country it was played in (Spotify's `conn_country`),
# so "10 AM in Brussels" counts as 10 AM, not 4 AM Toronto time. Countries spanning several time zones
# use the one I'm most likely to have been in. Unknown countries keep the previous play's time zone.
COUNTRY_TZ = {
    "AU": "Australia/Sydney", "BE": "Europe/Brussels", "CA": "America/Toronto", "CH": "Europe/Zurich",
    "CL": "America/Santiago", "CR": "America/Costa_Rica", "DE": "Europe/Berlin", "DK": "Europe/Copenhagen",
    "ES": "Europe/Madrid", "FR": "Europe/Paris", "GB": "Europe/London", "GR": "Europe/Athens",
    "HK": "Asia/Hong_Kong", "IE": "Europe/Dublin", "IL": "Asia/Jerusalem", "IT": "Europe/Rome",
    "KH": "Asia/Phnom_Penh", "LU": "Europe/Luxembourg", "MT": "Europe/Malta", "MX": "America/Mexico_City",
    "NL": "Europe/Amsterdam", "NZ": "Pacific/Auckland", "PH": "Asia/Manila", "PT": "Europe/Lisbon",
    "QA": "Asia/Qatar", "SE": "Europe/Stockholm", "TH": "Asia/Bangkok", "US": "America/New_York",
    "VN": "Asia/Ho_Chi_Minh", "AT": "Europe/Vienna", "IS": "Atlantic/Reykjavik", "JP": "Asia/Tokyo",
    "MA": "Africa/Casablanca", "NO": "Europe/Oslo", "PL": "Europe/Warsaw", "CZ": "Europe/Prague",
}
_tz_cache = {}


def tz_for(country):
    """ZoneInfo for a country code, or None if unknown."""
    name = COUNTRY_TZ.get(country or "")
    if not name or ZoneInfo is None:
        return None
    if name not in _tz_cache:
        _tz_cache[name] = ZoneInfo(name)
    return _tz_cache[name]

PLAY_THRESHOLD_MS = 30_000
TOP_N_ALL_TIME = 100
TOP_N_PER_YEAR = 25
TOP_N_PER_MONTH = 10
TRACK_INDEX_SIZE = 1000  # tracks we will later look up BPM for


def find_files(input_dir: Path):
    patterns = ["Streaming_History_Audio_*.json", "StreamingHistory_music_*.json", "StreamingHistory[0-9]*.json"]
    files = set()
    for pattern in patterns:
        files.update(input_dir.rglob(pattern))
    return sorted(files)


def normalize(row: dict):
    """Return a clean play dict, or None for non-music rows. Handles both export formats."""
    if "ts" in row:  # extended streaming history
        track = row.get("master_metadata_track_name")
        artist = row.get("master_metadata_album_artist_name")
        if not track or not artist:
            return None  # podcast, audiobook, or missing metadata
        ts = datetime.fromisoformat(row["ts"].replace("Z", "+00:00"))
        uri = row.get("spotify_track_uri") or ""
        return {
            "ts": ts,
            "ms": int(row.get("ms_played") or 0),
            "track": track,
            "artist": artist,
            "album": row.get("master_metadata_album_album_name") or "",
            "track_id": uri.split(":")[-1] if uri.startswith("spotify:track:") else None,
            "skipped": bool(row.get("skipped")),
            "country": row.get("conn_country"),  # only used to pick the time zone; never written out
        }
    if "endTime" in row:  # basic account-data format, times are "YYYY-MM-DD HH:MM" in UTC
        track, artist = row.get("trackName"), row.get("artistName")
        if not track or not artist or artist == "Unknown Artist":
            return None
        ts = datetime.strptime(row["endTime"], "%Y-%m-%d %H:%M").replace(tzinfo=timezone.utc)
        return {"ts": ts, "ms": int(row.get("msPlayed") or 0), "track": track, "artist": artist,
                "album": "", "track_id": None, "skipped": False, "country": None}
    return None


def load_plays(input_dir: Path):
    plays, seen = [], set()
    files = find_files(input_dir)
    if not files:
        raise SystemExit(f"No streaming history JSON files found under {input_dir}")
    for f in files:
        with open(f, encoding="utf-8") as fh:
            rows = json.load(fh)
        for row in rows:
            p = normalize(row)
            if p is None:
                continue
            key = (p["ts"], p["track"], p["artist"], p["ms"])  # de-duplicate overlapping exports
            if key in seen:
                continue
            seen.add(key)
            plays.append(p)
    plays.sort(key=lambda p: p["ts"])
    # local time = time in the country of each play (carry the last known zone over unknown countries)
    current = LOCAL_TZ
    for p in plays:
        current = tz_for(p.pop("country")) or current
        p["local"] = p["ts"].astimezone(current)
    print(f"Read {len(files)} file(s), {len(plays)} music rows.")
    return plays


def minutes(ms: float) -> float:
    return round(ms / 60_000, 1)


def ranked(stats: dict, n: int):
    """stats: name -> {"ms":..., "plays":...}; returns top n by ms."""
    items = sorted(stats.items(), key=lambda kv: kv[1]["ms"], reverse=True)[:n]
    return [{"name": k if isinstance(k, str) else k[0], **({"artist": k[1]} if isinstance(k, tuple) else {}),
             "minutes": minutes(v["ms"]), "plays": v["plays"], **({"track_id": v["track_id"]} if v.get("track_id") else {})}
            for k, v in items]


def build(plays):
    daily = defaultdict(lambda: {"ms": 0, "plays": 0})
    yearly = defaultdict(lambda: {"ms": 0, "plays": 0, "artists": set(), "tracks": set()})
    hour_weekday = [[0] * 24 for _ in range(7)]  # [weekday Mon=0][hour] -> ms
    artists_all = defaultdict(lambda: {"ms": 0, "plays": 0})
    tracks_all = defaultdict(lambda: {"ms": 0, "plays": 0, "track_id": None})
    artists_year = defaultdict(lambda: defaultdict(lambda: {"ms": 0, "plays": 0}))
    tracks_year = defaultdict(lambda: defaultdict(lambda: {"ms": 0, "plays": 0, "track_id": None}))
    monthly = defaultdict(lambda: {"ms": 0, "plays": 0, "artists": set()})
    artists_month = defaultdict(lambda: defaultdict(lambda: {"ms": 0, "plays": 0}))
    tracks_month = defaultdict(lambda: defaultdict(lambda: {"ms": 0, "plays": 0, "track_id": None}))
    skips = Counter()

    for p in plays:
        lt, ms = p["local"], p["ms"]
        counted = 1 if ms >= PLAY_THRESHOLD_MS else 0
        day, year, month = lt.date().isoformat(), lt.year, lt.strftime("%Y-%m")
        tkey = (p["track"], p["artist"])
        m = monthly[month]
        m["ms"] += ms
        m["plays"] += counted
        m["artists"].add(p["artist"])

        daily[day]["ms"] += ms
        daily[day]["plays"] += counted
        y = yearly[year]
        y["ms"] += ms
        y["plays"] += counted
        y["artists"].add(p["artist"])
        y["tracks"].add(tkey)
        hour_weekday[lt.weekday()][lt.hour] += ms

        for bucket in (artists_all[p["artist"]], artists_year[year][p["artist"]], artists_month[month][p["artist"]]):
            bucket["ms"] += ms
            bucket["plays"] += counted
        for bucket in (tracks_all[tkey], tracks_year[year][tkey], tracks_month[month][tkey]):
            bucket["ms"] += ms
            bucket["plays"] += counted
            bucket["track_id"] = bucket["track_id"] or p["track_id"]
        if p["skipped"]:
            skips[p["artist"]] += 1

    total_ms = sum(p["ms"] for p in plays)
    out = {
        "summary": {
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "timezone": "local time of the country each song was played in",
            "first_play": plays[0]["local"].date().isoformat(),
            "last_play": plays[-1]["local"].date().isoformat(),
            "total_minutes": minutes(total_ms),
            "total_plays": sum(d["plays"] for d in daily.values()),
            "unique_artists": len(artists_all),
            "unique_tracks": len(tracks_all),
            "days_listened": len(daily),
        },
        "daily": [{"date": d, "minutes": minutes(v["ms"]), "plays": v["plays"]} for d, v in sorted(daily.items())],
        "yearly": [{
            "year": yr, "minutes": minutes(v["ms"]), "plays": v["plays"],
            "unique_artists": len(v["artists"]), "unique_tracks": len(v["tracks"]),
            "top_artist": ranked(artists_year[yr], 1)[0]["name"] if artists_year[yr] else None,
        } for yr, v in sorted(yearly.items())],
        "monthly": [{
            "month": mo, "minutes": minutes(v["ms"]), "plays": v["plays"], "unique_artists": len(v["artists"]),
            "top_artist": ranked(artists_month[mo], 1)[0]["name"] if artists_month[mo] else None,
        } for mo, v in sorted(monthly.items())],
        "hour_weekday": {
            "weekdays": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            "minutes": [[minutes(ms) for ms in row] for row in hour_weekday],
        },
        "top_artists": {"all_time": ranked(artists_all, TOP_N_ALL_TIME),
                        "by_year": {str(yr): ranked(a, TOP_N_PER_YEAR) for yr, a in sorted(artists_year.items())},
                        "by_month": {mo: ranked(a, TOP_N_PER_MONTH) for mo, a in sorted(artists_month.items())}},
        "top_tracks": {"all_time": ranked(tracks_all, TOP_N_ALL_TIME),
                       "by_year": {str(yr): ranked(t, TOP_N_PER_YEAR) for yr, t in sorted(tracks_year.items())},
                       "by_month": {mo: ranked(t, TOP_N_PER_MONTH) for mo, t in sorted(tracks_month.items())}},
        # inputs for later enrichment steps (genres via Last.fm, BPM via ReccoBeats/Deezer)
        "artists_index": ranked(artists_all, len(artists_all)),
        "tracks_index": [t for t in ranked(tracks_all, TRACK_INDEX_SIZE) if t.get("track_id")],
    }
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", default="data/raw", help="folder containing the unzipped export(s)")
    parser.add_argument("--out", default="data/processed", help="folder to write JSON summaries to")
    args = parser.parse_args()

    plays = load_plays(Path(args.input))
    result = build(plays)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, data in result.items():
        path = out_dir / f"{name}.json"
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))
        print(f"  wrote {path} ({path.stat().st_size / 1024:.1f} KB)")
    s = result["summary"]
    print(f"Done: {s['total_minutes']:,} minutes, {s['total_plays']:,} plays, "
          f"{s['first_play']} -> {s['last_play']}")


if __name__ == "__main__":
    main()
