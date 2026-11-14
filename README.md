# Spotify Listening Dashboard

A personal dashboard of my Spotify listening history — charts over time, top artists and tracks,
genres, listening habits, and year-over-year totals.

> Built with Python (data pipeline) + Next.js (dashboard), hosted on Vercel.
> Genre data powered by [Last.fm](https://www.last.fm).

---

## Setup guide (Windows) — start here

### 1. Install the tools (one time)
| Tool | Where | Notes |
|---|---|---|
| **Git** | https://git-scm.com/download/win | Accept the defaults in the installer. |
| **Node.js (LTS)** | https://nodejs.org | Needed for the website part. Pick the "LTS" version. |
| **Cursor** | https://cursor.com | The AI code editor. Sign in when it opens. |
| **Python** | already installed (Anaconda) | Check with `python --version` in a terminal. |

After installing, **restart your computer** (or at least close and reopen Cursor) so the new tools are found.

### 2. Open the project in Cursor
1. Open Cursor → **File → Open Folder** → choose `C:\Users\eglan\repos\spotify-dashboard`.
2. If it asks whether you trust the folder's authors, choose **Yes** (it's your own folder).
3. Open the terminal: **View → Terminal** (or <kbd>Ctrl</kbd>+<kbd>`</kbd>). It opens in the project folder.

Cursor automatically reads `AGENTS.md` and the rules in `.cursor/rules/` — that's how the AI agent learns
the project's rules (privacy, Windows commands, small steps, no invented APIs).

Worth checking in Cursor's settings (names may differ slightly by version — look around Settings):
- **Privacy mode**: consider turning it on so your code isn't stored for training.
- **Terminal commands**: keep the agent asking for your approval before it runs commands, at least at first.

### 3. Test the data pipeline with fake data
In Cursor's terminal:
```powershell
pip install -r pipeline/requirements.txt
python pipeline/process_export.py --input pipeline/sample_data --out data/processed_sample
```
You should see `Done: ... minutes, ... plays`. The sample data is invented, just to check everything works.

### 4. Put it on GitHub
1. In Cursor, click the **Source Control** icon in the left sidebar (the branching icon).
2. Click **Initialize Repository**, type a message like `starter kit`, and click **Commit**.
3. Click **Publish Branch** / **Publish to GitHub**, sign in to GitHub, and choose **public** (so people can see your work)
   or private. Your raw data and secrets are excluded by `.gitignore` either way.
4. **Before the first commit, check the list of changed files** — you should never see `.env` or anything inside `data/raw/` besides its README.

### 5. Add your secrets
Copy `.env.example` to a new file named `.env` and fill in your Spotify and Last.fm keys.
Never paste these values into a chat (including with Claude or the Cursor agent).

### 6. When your Spotify export arrives
Unzip it into `data/raw/`, then:
```powershell
python pipeline/process_export.py --input data/raw --out data/processed
```

---

## Working with the Cursor agent
- Open the chat panel, pick **Agent** mode, and give it **one task at a time** from `docs/PLAN.md`.
- Good first prompt:
  > Read AGENTS.md and docs/PLAN.md. Then propose a plan (don't write code yet) for the Phase 2 task
  > "Scaffold Next.js + TypeScript + Tailwind in web/". List every command you'd run.
- Review what it proposes, then let it go ahead. When done, **commit and push** in Source Control.
- Then ask Claude (in the Claude app) to review the latest commit on GitHub — it can read the repo, check the
  changes for mistakes or exposed secrets, and suggest the next prompt.

## Project structure
```
AGENTS.md            rules for AI agents (Cursor reads this; CLAUDE.md points to it for Claude Code)
.cursor/rules/       extra Cursor rules (.mdc files)
docs/PLAN.md         roadmap + checklist
docs/DATA_SOURCES.md what each API can/can't do (as of Nov 2026)
pipeline/            Python scripts that turn raw exports into small JSON summaries
data/raw/            your private exports (never uploaded)
data/processed/      summaries the website displays
web/                 the Next.js website (created in Phase 2)
```
