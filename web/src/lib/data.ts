// Server-side helpers that read the JSON summaries from public/data.
// These run at build/request time on the server, never in the browser.
import { readFile } from "node:fs/promises";
import path from "node:path";

export type Summary = {
  generated_at: string;
  timezone: string;
  first_play: string; // YYYY-MM-DD
  last_play: string;
  total_minutes: number;
  total_plays: number;
  unique_artists: number;
  unique_tracks: number;
  days_listened: number;
};
export type DayStat = { date: string; minutes: number; plays: number };
export type MonthStat = { month: string; minutes: number; plays: number; unique_artists: number; top_artist: string | null };
export type YearStat = { year: number; minutes: number; plays: number; unique_artists: number; unique_tracks: number; top_artist: string | null };
export type RankedArtist = { name: string; minutes: number; plays: number };
export type RankedTrack = RankedArtist & { artist: string; track_id?: string };
export type TopLists<T> = { all_time: T[]; by_year: Record<string, T[]>; by_month: Record<string, T[]> };

async function readJson<T>(name: string): Promise<T> {
  const file = path.join(process.cwd(), "public", "data", `${name}.json`);
  try {
    return JSON.parse(await readFile(file, "utf-8")) as T;
  } catch {
    throw new Error(`Could not read public/data/${name}.json — run "npm run sync-data" first.`);
  }
}

export const getSummary = () => readJson<Summary>("summary");
export const getDaily = () => readJson<DayStat[]>("daily");
export const getMonthly = () => readJson<MonthStat[]>("monthly");
export const getYearly = () => readJson<YearStat[]>("yearly");
export const getTopArtists = () => readJson<TopLists<RankedArtist>>("top_artists");
export const getTopTracks = () => readJson<TopLists<RankedTrack>>("top_tracks");
