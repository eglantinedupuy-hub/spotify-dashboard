# Data sources — facts, limits, and things still to verify

Last researched: 2026-11-14. APIs change; re-check the linked official docs before relying on anything here.
Items marked **[VERIFY]** have not been tested by us yet.

## 1. Spotify data export (main source)
Request at spotify.com → Account → Account privacy → Download your data.
- **Account data**: about 1 year of history, playlists, library (`YourLibrary.json`), Wrapped data. ~5 days.
- **Extended streaming history**: every play since the account was created. Up to 30 days.
- Files: `Streaming_History_Audio_*.json`. Read the included "Read Me First" file for field definitions.
- Fields we use (confirm against the Read Me First): `ts` (UTC), `ms_played`, `master_metadata_track_name`,
  `master_metadata_album_artist_name`, `master_metadata_album_album_name`, `spotify_track_uri`,
  `reason_start`, `reason_end`, `shuffle`, `skipped`, `platform`.
- Fields we never output (sensitive): `ip_addr`, `conn_country`, anything with "user_agent" or "username".

## 2. Spotify Web API (owner-only, live data + playlist creation)
Docs: https://developer.spotify.com/documentation/web-api
- Development Mode: owner needs **Premium**; max **5 authorized users**. Fine for personal use.
- Redirect URIs: `localhost` is NOT allowed — use `http://127.0.0.1:PORT/...`.
- Refresh tokens expire ~6 months after authorization → re-login twice a year. [VERIFY current policy]
- **Available** (per Feb 2026 changelog): `GET /me`, `GET /me/top/{artists|tracks}` (time_range short/medium/long),
  `GET /me/player/recently-played` (only ~50 most recent, no further paging), `GET /me/tracks`, `GET /me/playlists`,
  single-item `GET /tracks/{id}`, `GET /artists/{id}`, `POST /me/playlists`, `POST /playlists/{id}/items`, search (max 10 results).
- **Removed / unavailable**: batch `GET /tracks` & `GET /artists`, audio features (BPM etc.), recommendations,
  related artists, artist top-tracks, browse/new releases, popularity & followers fields.
- Artist `genres` field: conflicting reports on whether it is still returned. [VERIFY with one call] → we use Last.fm instead.
- Migration guide: https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide

## 3. Last.fm (genres + daily play log)
Docs: https://www.last.fm/api — Terms: https://www.last.fm/api/tos (non-commercial use only).
- Get a key at https://www.last.fm/api/account/create (choose Non-commercial).
- Connect Spotify scrobbling: last.fm → Settings → Applications → Spotify Scrobbling → Connect. Logs plays from then on.
- `artist.getTopTags` — tags per artist (works for the whole historic artist list). Tags are user-generated and noisy
  → map to ~15 clean genres via `pipeline/genre_map.json` (to create).
- `user.getRecentTracks` — scrobble log, paginated; use for the daily refresh / minutes counter.
  Scrobbles have no "ms played" → estimate minutes from track duration. [VERIFY field availability]
- Credit/link back to Last.fm where its data is shown. [VERIFY exact attribution requirement in ToS]

## 4. BPM (Spotify no longer provides it) — test both on ~20 tracks before building on them
- **ReccoBeats**: Spotify-style audio features addressable by Spotify track ID, reportedly no API key.
  Docs: https://reccobeats.com/docs [VERIFY endpoint path, rate limits, terms, coverage]
- **Deezer public API**: track object includes `bpm`; lookup by ISRC (likely `https://api.deezer.com/track/isrc:<ISRC>`).
  ISRC comes from Spotify `GET /tracks/{id}` → `external_ids.isrc`. Many tracks may return `bpm: 0`.
  Docs: https://developers.deezer.com/api/track [VERIFY ISRC syntax, terms]
- Only fetch BPM for the top ~1,000 tracks; cache results.

## 5. Hosting limits (Vercel Hobby)
- Personal, non-commercial use only.
- Cron jobs: max once per day → fine for a daily refresh. A scheduled GitHub Action is the alternative.
