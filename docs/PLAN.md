# Roadmap

Tick boxes as things get done. Agents: only work on one unchecked item at a time unless asked otherwise.

## Design direction (applies to every page)
- **Colours:** Spotify-inspired. Near-black background (~#121212), dark grey cards (~#181818 / #242424),
  Spotify green accent (~#1DB954) for highlights and the main chart series, white/light-grey text.
  Use a small set of secondary chart colours that stay readable on dark backgrounds.
- **Style:** clean and minimal, lots of spacing, **rounded cards**, no clutter.
- **Interactive:** hover states on cards, tooltips on every chart, clickable stats that lead to the detailed page
  (e.g. click "Top artist this month" → Top artists page filtered to that month).
- **Count-up numbers:** on the Overview, big stat numbers animate from 0 to their value on page load
  (~1s, ease-out). Respect `prefers-reduced-motion` (show final value immediately). Write a small hook — no extra library.
- **Navigation:** simple top or side nav: Overview · Over time · Habits · Top · Playlists · (later) Genres, Library.
- Responsive: must look fine on a phone.

## Phase 0 — Accounts & setup (owner, no code)
- [x] Install Git, Node.js LTS, Cursor; open this folder in Cursor
- [x] Publish repo to GitHub (eglantinedupuy-hub/spotify-dashboard)
- [ ] Request Spotify data export (Account data + Extended streaming history)
- [ ] Create Last.fm account, connect Spotify Scrobbling, create Non-commercial API key
- [ ] Create Spotify developer app; redirect URI `http://127.0.0.1:3000/api/auth/callback/spotify` (needed for Playlists page + Phase 4)
- [ ] Copy `.env.example` → `.env` and fill in keys

## Phase 1 — Data pipeline (Python)
- [x] `process_export.py`: daily / monthly / yearly totals, top artists & tracks (all-time, by year, by month), hour × weekday grid (tested on fake data)
- [ ] Run it on the real Account data export; sanity-check numbers
- [ ] Run it on the Extended streaming history once it arrives
- [ ] `lastfm_genres.py`: `artist.getTopTags` for top artists, cached, mapped to ~15 clean genres (`genre_map.json`)
- [ ] Genre outputs: genre share by year/month (minutes + %), "recently into" (last 90 days vs all-time), genre per artist (for filtering Top)
- [ ] `monthly_playlists.py`: fetch my playlists (`GET /me/playlists`, owner login), detect monthly playlists named like `October 23'` (full English month, space, two-digit year, apostrophe — also match without the apostrophe, e.g. `October 23`), save name / year / month / Spotify link / cover image / track count to `monthly_playlists.json`. They are public.
- [ ] `library_unplayed.py`: saved tracks/artists/playlists never (or barely) played
- [ ] BPM test: ReccoBeats and Deezer on 20 tracks → record coverage in DATA_SOURCES.md
- [ ] `bpm.py`: BPM for top ~1,000 tracks, cached

## Phase 2 — Web dashboard (Next.js), built against fake data first
- [x] Scaffold Next.js (App Router, TS, Tailwind, ESLint, `src/`) in `web/`; install Recharts
- [x] Data copy script: `data/processed_sample` (later `data/processed`) → `web/public/data/`
- [x] App shell: dark theme, nav, card component, count-up hook, chart tooltip style
- [x] **Overview**: "This month" and "This year" cards — minutes (count-up), plays, top artist, top track; small comparison to the same month / same point last year. "This month" = latest month in the data until live refresh exists.
- [ ] **Over time**: minutes per month across all years; toggle day / month / year; compare years side by side
- [ ] **Year view**: cumulative minutes this year vs previous years (line per year) + daily bars — the "Wrapped record" tracker
- [ ] **Habits**: heatmap of weekday × hour, colour = minutes listened; hover shows exact minutes
- [ ] **Top artists & tracks**: filter by all-time / year / month (later: genre); click an artist → their stats
- [ ] **Monthly playlists**: when visiting in month X, show my public playlists for month X from previous years, newest year first, with cover, track count and an "Open in Spotify" button. Names look like `October 23'` (full English month, space, two-digit year, apostrophe; also match `October 23` without the apostrophe).
- [ ] **Genres** page (after Last.fm step; with "Powered by Last.fm" credit)
- [ ] **Saved but never played** page
- [ ] **On this day** — DECIDE first: public or owner-only?

## Phase 3 — Deploy
- [ ] Connect GitHub repo to Vercel (root directory: `web`)
- [ ] Add env vars in Vercel; add production redirect URI to Spotify app
- [ ] Link from eglantinedupuy-hub.github.io (or custom domain)

## Phase 4 — Owner features & live data
- [ ] Spotify login (owner only)
- [ ] Create playlist by genre and/or BPM range
- [ ] Daily refresh from Last.fm scrobbles (Vercel cron once/day or GitHub Action) → keeps "this month" current
- [ ] Live "top this month" panel from `GET /me/top/*`

## Open questions
- None right now. Monthly playlist naming and visibility are recorded on the Monthly playlists items above: names like `October 23'` (also `October 23`), and the playlists are public.

## Ideas parking lot
- **Letterboxd project** (films): export is instant (Settings → Data → CSVs incl. diary.csv). Could be a separate project or a page of this site. Owner wants to do this next.
- Other data sources later (Goodreads, Apple Health)
