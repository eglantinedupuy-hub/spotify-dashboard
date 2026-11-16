// Copies the pipeline's JSON summaries into web/src/data, where the site imports them.
// Commit web/src/data: that's what Vercel builds from.
//
//   npm run sync-data   (also runs automatically before `npm run dev` and `npm run build`)
//
// Source: ../data/processed (my real data) if it exists, otherwise ../data/processed_sample (fake data).
// Override with DATA_DIR, e.g. PowerShell: $env:DATA_DIR="../data/processed_sample"; npm run dev
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
// read + write instead of copyFile (copyFile fails on some synced/mounted folders)
const copy = (from, to) => writeFileSync(to, readFileSync(from));

// Only the files the website uses (artists_index / tracks_index are pipeline-only and large)
const FILES = ["summary", "daily", "monthly", "yearly", "hour_weekday", "top_artists", "top_tracks"];

mkdirSync(target, { recursive: true });
if (!existsSync(path.join(source, "summary.json"))) {
  // e.g. on Vercel if only the web/ folder is available: use the committed copies in src/data
  console.log(`sync-data: ${source} not found, using the committed files in src/data`);
} else {
  for (const f of FILES) copy(path.join(source, `${f}.json`), path.join(target, `${f}.json`));
  // optional extras: Spotify API, Last.fm genres, liked-but-unplayed (their own pipeline scripts)
  for (const f of ["spotify_api", "genres", "library", "personas"]) {
    const file = path.join(real, `${f}.json`);
    if (existsSync(file)) copy(file, path.join(target, `${f}.json`));
  }
  console.log(`sync-data: copied files from ${path.relative(webDir, source)} to src/data`);
}
// placeholders so the site still builds before those scripts have been run
const placeholders = {
  spotify_api: { fetched_at: null, monthly_playlists: [], playlists: [], top: { artists: {}, tracks: {} }, recent: [] },
  genres: { source: "", genres: [], electronic_subgenres: [], by_month: {}, by_month_electronic: {}, total_by_month: {}, artists: {}, top_by_genre: {}, coverage: 0, min_plays: 0 },
  personas: { now: null, all_time: null, by_year: {}, personas: { when: [], how: [] }, stat_labels: {} },
  library: { liked_total: 0, followed_total: 0, liked_never_played: [], liked_barely_played: [], followed_barely_listened: [] },
};
for (const [name, empty] of Object.entries(placeholders)) {
  const file = path.join(target, `${name}.json`);
  if (!existsSync(file)) writeFileSync(file, JSON.stringify(empty));
}
