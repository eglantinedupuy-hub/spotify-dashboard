"""
Create a Spotify playlist from my own listening history, e.g. my most-played songs of a genre in a year.

Usage (from the project root, after lastfm_genres.py):
    python pipeline/make_playlist.py --genre "Indie & alternative" --year 2024
    python pipeline/make_playlist.py --genre "French pop & chanson" --size 40
    python pipeline/make_playlist.py --year 2019                        # top 50 of 2019, any genre
    python pipeline/make_playlist.py --genre "R&B & soul" --recent       # last 90 days
    python pipeline/make_playlist.py --list-genres

Songs are ranked by minutes I listened. The playlist is created as PRIVATE unless you add --public.
Uses the same Spotify login as spotify_fetch.py.
"""

import argparse
import json
import os
import sys
from collections import defaultdict
from datetime import timedelta
from pathlib import Path

import requests
from dotenv import load_dotenv

from process_export import load_plays
from spotify_fetch import API, get_token

ROOT = Path(__file__).resolve().parent.parent


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--genre", help='one of the genres from genres.json, e.g. "Indie & alternative"')
    ap.add_argument("--year", type=int, help="only songs I played in this year")
    ap.add_argument("--recent", action="store_true", help="only the last 90 days of my history")
    ap.add_argument("--size", type=int, default=50, help="number of songs (default 50)")
    ap.add_argument("--name", help="playlist name (default is generated)")
    ap.add_argument("--public", action="store_true")
    ap.add_argument("--list-genres", action="store_true")
    args = ap.parse_args()

    genres = json.loads((ROOT / "data" / "processed" / "genres.json").read_text(encoding="utf-8"))
    if args.list_genres or (args.genre and args.genre not in genres["genres"]):
        if args.genre:
            print(f'Unknown genre "{args.genre}".')
        print("Genres:", " | ".join(genres["genres"]))
        return
    artist_genre = genres["artists"]

    plays = load_plays(ROOT / "data" / "raw")
    since = plays[-1]["ts"] - timedelta(days=90) if args.recent else None
    minutes = defaultdict(float)
    for p in plays:
        if not p["track_id"]:
            continue
        if args.year and p["local"].year != args.year:
            continue
        if since and p["ts"] < since:
            continue
        if args.genre and artist_genre.get(p["artist"]) != args.genre:
            continue
        minutes[(p["track_id"], p["track"], p["artist"])] += p["ms"] / 60_000
    top = sorted(minutes.items(), key=lambda kv: -kv[1])[: args.size]
    if not top:
        sys.exit("No songs match — try another genre or year.")

    period = str(args.year) if args.year else "last 90 days" if args.recent else "all time"
    name = args.name or f"{args.genre or 'Top songs'} · {period}"
    print(f'Creating "{name}" with {len(top)} songs, e.g. ' + "; ".join(f"{t} – {a}" for (_, t, a), _ in top[:3]))

    load_dotenv(ROOT / ".env")
    s = requests.Session()
    s.headers["Authorization"] = f"Bearer {get_token(os.environ['SPOTIFY_CLIENT_ID'].strip())}"
    r = s.post(f"{API}/me/playlists", json={
        "name": name, "public": args.public,
        "description": f"My most-played {args.genre or ''} songs, {period}. Made by my listening dashboard.".replace("  ", " "),
    }, timeout=20)
    r.raise_for_status()
    playlist = r.json()
    uris = [f"spotify:track:{tid}" for (tid, _, _), _ in top]
    for i in range(0, len(uris), 100):  # max 100 songs per request
        s.post(f"{API}/playlists/{playlist['id']}/items", json={"uris": uris[i:i + 100]}, timeout=20).raise_for_status()
    print("Done:", (playlist.get("external_urls") or {}).get("spotify"))


if __name__ == "__main__":
    main()
