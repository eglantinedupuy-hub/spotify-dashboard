# Roadmap

Tick boxes as things get done. Agents: only work on one unchecked item at a time unless asked otherwise.

## Phase 0 — Accounts & setup (owner, no code)
- [ ] Request Spotify data export (Account data + Extended streaming history)
- [ ] Create Spotify developer app; redirect URI `http://127.0.0.1:3000/api/auth/callback/spotify`
- [ ] Create Last.fm account, connect Spotify Scrobbling, create Non-commercial API key
- [ ] Install Git, Node.js LTS, Cursor; open this folder in Cursor
- [ ] Publish repo to GitHub (eglantinedupuy-hub)
- [ ] Copy `.env.example` → `.env` and fill in keys

## Phase 1 — Data pipeline (Python)
- [x] `process_export.py` skeleton: daily/yearly totals, top artists/tracks, hour-of-day (tested on fake sample data)
- [ ] Run it on the real Account data export; check numbers look right
- [ ] Run it on the Extended streaming history once it arrives
- [ ] `lastfm_genres.py`: fetch `artist.getTopTags` for top artists, cache, map to clean genres (`genre_map.json`)
- [ ] Genre outputs: genre share by year/month (minutes + %), "recently into" (last 90 days vs all-time)
- [ ] `library_unplayed.py`: saved tracks/artists/playlists never (or barely) played, from `YourLibrary.json` + playlists
- [ ] BPM test: try ReccoBeats and Deezer on 20 tracks, record coverage in DATA_SOURCES.md
- [ ] `bpm.py`: BPM for top ~1,000 tracks, cached

## Phase 2 — Web dashboard (Next.js)
- [ ] Scaffold Next.js + TypeScript + Tailwind in `web/` (ask before running the generator)
- [ ] Copy `data/processed/*.json` → `web/public/data/` (small script or npm step)
- [ ] Overview page: total minutes, years active, top artist/track
- [ ] Listening over time chart (daily/monthly)
- [ ] Year page: minutes cumulative vs previous years + daily bars ("Wrapped record" comparison)
- [ ] Hour-of-day / weekday heatmap
- [ ] Top artists & tracks by year
- [ ] Genres page (Last.fm-derived, with credit)
- [ ] "Saved but never played" page
- [ ] "On this day" page — DECIDE first: public or owner-only?

## Phase 3 — Deploy
- [ ] Connect GitHub repo to Vercel (root directory: `web`)
- [ ] Add env vars in Vercel; add production redirect URI to Spotify app
- [ ] Custom domain or link from eglantinedupuy-hub.github.io

## Phase 4 — Owner features & live data
- [ ] Spotify login (owner only)
- [ ] Create playlist by genre and/or BPM range
- [ ] Daily refresh from Last.fm scrobbles (Vercel cron once/day or GitHub Action)
- [ ] Live "top this month" panel from `GET /me/top/*`

## Ideas parking lot
- Add other data sources later (Letterboxd, Goodreads, Apple Health) as extra pages
