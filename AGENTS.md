# AGENTS.md — Spotify Listening Dashboard

Instructions for any AI coding agent (Cursor, Claude Code, etc.) working in this repo.
Read this file fully before making changes. The roadmap lives in `docs/PLAN.md`;
facts about external APIs live in `docs/DATA_SOURCES.md`.

## What this project is
A personal dashboard of Eglantine's Spotify listening, built as a portfolio piece.
- **Public visitors** browse charts built from pre-computed summary files. They never log in.
- **The owner** can log in with Spotify to use owner-only features (e.g. create playlists).
- It is a personal, non-commercial project. Low maintenance is fine.

## Stack
- `pipeline/` — **Python 3** scripts that turn raw exports / API data into small JSON summaries.
- `web/` — **Next.js (App Router) + TypeScript + Tailwind CSS**, charts with **Recharts**. Not created yet — see PLAN.md phase 2.
- Hosting: **Vercel** (Hobby plan), code on **GitHub**.
- OS: the owner develops on **Windows**. Give PowerShell-compatible commands.

## Directory map
```
data/raw/          # Spotify / Last.fm raw exports. GITIGNORED. Never commit, never read into the web app.
data/processed/    # Small JSON summaries produced by pipeline/. Safe to commit (they are public).
pipeline/          # Python processing scripts (+ sample_data/ with FAKE rows for testing)
web/               # Next.js app (to be created)
docs/              # PLAN.md (roadmap + checklist), DATA_SOURCES.md (API facts and limits)
```

## Commands
- Process export: `python pipeline/process_export.py --input data/raw --out data/processed`
- Test with fake data: `python pipeline/process_export.py --input pipeline/sample_data --out data/processed_sample`
- Web (once created): `cd web; npm run dev -- --hostname 127.0.0.1` then open http://127.0.0.1:3000

## Hard rules
1. **Never commit secrets or raw data.** `.env*` (except `.env.example`) and `data/raw/` stay out of git. Never print tokens or API keys in logs.
2. **Privacy:** the web app only reads `data/processed/` (or copies of it in `web/public/data/`). Never ship IP addresses, raw play-by-play logs, or anything from `data/raw/` to the browser.
3. **Do not invent APIs.** Spotify's Web API changed heavily in 2024–2026; many tutorials are outdated. Before using any Spotify, Last.fm, Deezer or ReccoBeats endpoint, check `docs/DATA_SOURCES.md` and the official docs. If unsure an endpoint/field exists, say so and ask.
4. **Spotify redirect URIs must use `127.0.0.1`, never `localhost`.**
5. **Ask before** adding a new dependency, deleting files, or changing the folder structure.
6. **Small steps.** One feature per change. After each change: explain what changed in plain language, how to test it, and tick the box in `docs/PLAN.md`.
7. The owner is learning — prefer simple, readable code over clever code, and add short comments where logic isn't obvious.

## Definition of done for any task
- It runs locally without errors (show the exact command used).
- No secrets or raw data in the diff.
- `docs/PLAN.md` updated.
- A 3–5 line summary of what changed and what to check.
