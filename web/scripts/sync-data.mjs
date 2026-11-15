// Copies the pipeline's JSON summaries into web/src/data, where the site imports them.
// Commit web/src/data: that's what Vercel builds from.
//
//   npm run sync-data   (also runs automatically before `npm run dev` and `npm run build`)
//
// Source: ../data/processed (my real data) if it exists, otherwise ../data/processed_sample (fake data).
// Override with DATA_DIR, e.g. PowerShell: $env:DATA_DIR="../data/processed_sample"; npm run dev
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const webDir = path.resolve(import.meta.dirname, "..");
const real = path.resolve(webDir, "../data/processed");
const sample = path.resolve(webDir, "../data/processed_sample");
const source = process.env.DATA_DIR
  ? path.resolve(webDir, process.env.DATA_DIR)
  : existsSync(path.join(real, "summary.json"))
    ? real
    : sample;
const target = path.join(webDir, "src", "data");

// Only the files the website uses (artists_index / tracks_index are pipeline-only and large)
const FILES = ["summary", "daily", "monthly", "yearly", "hour_weekday", "top_artists", "top_tracks"];

mkdirSync(target, { recursive: true });
if (!existsSync(path.join(source, "summary.json"))) {
  // e.g. on Vercel if only the web/ folder is available: use the committed copies in src/data
  console.log(`sync-data: ${source} not found, using the committed files in src/data`);
} else {
  for (const f of FILES) copyFileSync(path.join(source, `${f}.json`), path.join(target, `${f}.json`));
  // optional: data from the Spotify API (pipeline/spotify_fetch.py)
  const api = path.join(real, "spotify_api.json");
  if (existsSync(api)) copyFileSync(api, path.join(target, "spotify_api.json"));
  console.log(`sync-data: copied files from ${path.relative(webDir, source)} to src/data`);
}
// placeholder so the site still builds before spotify_fetch.py has been run
const apiTarget = path.join(target, "spotify_api.json");
if (!existsSync(apiTarget)) {
  writeFileSync(apiTarget, JSON.stringify({ fetched_at: null, monthly_playlists: [], playlists: [], top: { artists: {}, tracks: {} }, recent: [] }));
}
