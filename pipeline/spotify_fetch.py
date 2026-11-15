"""
Fetch my data from the Spotify Web API and save it for the dashboard:
  - my playlists, and which of them are my monthly playlists ("October 23'")
  - my top artists & tracks (last 4 weeks / 6 months / ~1 year)
  - my 50 most recently played tracks

Usage (from the project root):
    python pipeline/spotify_fetch.py

The first run opens your browser to log in to Spotify (once). After that it reuses a saved login
(data/raw/cache/spotify_token.json — private, never committed). Spotify refresh tokens expire after a while;
if that happens the script just asks you to log in again.

Needs in .env:  SPOTIFY_CLIENT_ID=...   (the client secret is NOT needed: this uses the PKCE login flow)
Redirect URI registered on the Spotify app:  http://127.0.0.1:8888/callback

Writes data/processed/spotify_api.json
Docs: https://developer.spotify.com/documentation/web-api  (playlist fields use the Feb 2026 names: items / item)
"""

import base64
import hashlib
import http.server
import json
import os
import re
import secrets
import sys
import threading
import time
import urllib.parse
import webbrowser
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "processed" / "spotify_api.json"
TOKEN_FILE = ROOT / "data" / "raw" / "cache" / "spotify_token.json"
REDIRECT = "http://127.0.0.1:8888/callback"
SCOPES = "playlist-read-private playlist-read-collaborative user-top-read user-read-recently-played"
API = "https://api.spotify.com/v1"

MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
# "October 23'", "October 23’", "October 23", "October 2023", "May 2.0 19'" (a second playlist for that month),
# "March & April 26’" (one playlist for two months)
_M = "(" + "|".join(MONTHS) + ")"
MONTHLY = re.compile(r"^\s*" + _M + r"(?:\s*&\s*" + _M + r")?(?:\s+\d\.\d)?\s+(\d{2}|\d{4})\s*['’]?\s*$", re.IGNORECASE)


# ---------- login (Authorization Code + PKCE) ----------

def login(client_id: str) -> dict:
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    state = secrets.token_urlsafe(16)
    result = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            result["code"], result["state"], result["error"] = q.get("code", [None])[0], q.get("state", [None])[0], q.get("error", [None])[0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write("<h2>Done — you can close this tab and go back to the terminal.</h2>".encode())

        def log_message(self, *args):  # keep the terminal quiet
            pass

    server = http.server.HTTPServer(("127.0.0.1", 8888), Handler)
    threading.Thread(target=server.handle_request, daemon=True).start()
    url = "https://accounts.spotify.com/authorize?" + urllib.parse.urlencode({
        "client_id": client_id, "response_type": "code", "redirect_uri": REDIRECT, "scope": SCOPES,
        "code_challenge_method": "S256", "code_challenge": challenge, "state": state,
    })
    print("Opening your browser to log in to Spotify… (if it doesn't open, paste this link in your browser)\n" + url)
    webbrowser.open(url)
    for _ in range(300):  # wait up to 5 minutes
        if result:
            break
        time.sleep(1)
    server.server_close()
    if not result.get("code") or result.get("state") != state:
        sys.exit(f"Login failed or was cancelled ({result.get('error') or 'no response'}).")

    r = requests.post("https://accounts.spotify.com/api/token", data={
        "grant_type": "authorization_code", "code": result["code"], "redirect_uri": REDIRECT,
        "client_id": client_id, "code_verifier": verifier,
    }, timeout=20)
    r.raise_for_status()
    return r.json()


def get_token(client_id: str) -> str:
    """Reuse the saved login if possible, otherwise log in in the browser."""
    tok = json.loads(TOKEN_FILE.read_text()) if TOKEN_FILE.exists() else None
    if tok and tok.get("refresh_token"):
        r = requests.post("https://accounts.spotify.com/api/token", data={
            "grant_type": "refresh_token", "refresh_token": tok["refresh_token"], "client_id": client_id,
        }, timeout=20)
        if r.ok:
            new = r.json()
            tok = {**tok, **new}  # Spotify may or may not send a new refresh token
        else:
            print("Saved login expired — logging in again.")
            tok = None
    if not tok:
        tok = login(client_id)
    TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
    TOKEN_FILE.write_text(json.dumps({"refresh_token": tok.get("refresh_token")}))
    return tok["access_token"]


# ---------- API helpers ----------

def api(session: requests.Session, url: str, **params):
    for attempt in range(4):
        r = session.get(url if url.startswith("http") else API + url, params=params or None, timeout=20)
        if r.status_code == 429:  # rate limited: Spotify says how long to wait
            time.sleep(int(r.headers.get("Retry-After", 2)) + 1)
            continue
        if r.status_code == 403:
            sys.exit(f"Spotify refused {url} (403). Is your account added as a user of the app in the Developer Dashboard?")
        r.raise_for_status()
        return r.json()
    r.raise_for_status()


def paged(session, url, **params):
    """Follow Spotify's `next` links and yield every item."""
    page = api(session, url, **params)
    while page:
        yield from page.get("items", [])
        page = api(session, page["next"]) if page.get("next") else None


def image(obj) -> str | None:
    imgs = obj.get("images") or []
    return imgs[0]["url"] if imgs else None


def track_info(t: dict) -> dict:
    return {
        "id": t.get("id"), "name": t.get("name"),
        "artists": [a["name"] for a in t.get("artists", [])],
        "album": (t.get("album") or {}).get("name"),
        "image": image(t.get("album") or {}),
        "url": (t.get("external_urls") or {}).get("spotify"),
    }


# ---------- main ----------

def main():
    load_dotenv(ROOT / ".env")
    client_id = os.environ.get("SPOTIFY_CLIENT_ID", "").strip()
    if not client_id:
        sys.exit("SPOTIFY_CLIENT_ID is missing from .env")
    s = requests.Session()
    s.headers["Authorization"] = f"Bearer {get_token(client_id)}"

    me = api(s, "/me")
    my_id = me.get("id")

    # Playlists (the playlist object's track count is under `items` since Feb 2026; older name was `tracks`)
    playlists = []
    for p in paged(s, "/me/playlists", limit=50):
        if not p:
            continue
        count = (p.get("items") or p.get("tracks") or {}).get("total")
        playlists.append({
            "id": p["id"], "name": p.get("name", ""), "url": (p.get("external_urls") or {}).get("spotify"),
            "image": image(p), "tracks": count, "public": p.get("public"),
            "mine": (p.get("owner") or {}).get("id") == my_id,
        })

    monthly = []
    for p in playlists:
        m = MONTHLY.match(p["name"])
        if m and p["mine"]:
            year = int(m.group(3))
            year = year + 2000 if year < 100 else year
            for month_name in filter(None, (m.group(1), m.group(2))):  # "March & April" -> both months
                monthly.append({**p, "year": year, "month": MONTHS.index(month_name.lower()) + 1})
    monthly.sort(key=lambda p: (p["year"], p["month"]), reverse=True)

    # Top artists & tracks for each time range
    top = {"artists": {}, "tracks": {}}
    for rng in ("short_term", "medium_term", "long_term"):
        arts = api(s, "/me/top/artists", time_range=rng, limit=50).get("items", [])
        top["artists"][rng] = [{
            "id": a.get("id"), "name": a.get("name"), "image": image(a),
            "genres": a.get("genres", []), "url": (a.get("external_urls") or {}).get("spotify"),
        } for a in arts]
        trks = api(s, "/me/top/tracks", time_range=rng, limit=50).get("items", [])
        top["tracks"][rng] = [track_info(t) for t in trks]

    recent = [{**track_info(i["track"]), "played_at": i.get("played_at")}
              for i in api(s, "/me/player/recently-played", limit=50).get("items", []) if i.get("track")]

    out = {
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "monthly_playlists": monthly,
        "playlists": [p for p in playlists if p["mine"]],
        "top": top,
        "recent": recent,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    with_genres = sum(1 for a in top["artists"]["long_term"] if a["genres"])
    print(f"Done: {len(playlists)} playlists ({len(monthly)} monthly, e.g. "
          f"{', '.join(p['name'] for p in monthly[:3]) or 'none found'}), "
          f"{len(top['artists']['short_term'])} top artists, {len(recent)} recent plays. "
          f"Artists with genres from Spotify: {with_genres}/{len(top['artists']['long_term'])}.")


if __name__ == "__main__":
    main()
