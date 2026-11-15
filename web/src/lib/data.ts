// Typed access to the JSON summaries in src/data (copied there by `npm run sync-data`).
// They're imported directly, so they're bundled into the build: works locally and on Vercel.
import summaryJson from "@/data/summary.json";
import dailyJson from "@/data/daily.json";
import monthlyJson from "@/data/monthly.json";
import yearlyJson from "@/data/yearly.json";
import hourWeekdayJson from "@/data/hour_weekday.json";
import topArtistsJson from "@/data/top_artists.json";
import topTracksJson from "@/data/top_tracks.json";
import spotifyApiJson from "@/data/spotify_api.json";

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

// The JSON's inferred type is replaced by the hand-written types above.
const load = <T,>(json: unknown) => async () => json as T;

export const getSummary = load<Summary>(summaryJson);
export const getDaily = load<DayStat[]>(dailyJson);
export const getMonthly = load<MonthStat[]>(monthlyJson);
export const getYearly = load<YearStat[]>(yearlyJson);
export const getTopArtists = load<TopLists<RankedArtist>>(topArtistsJson);
export const getTopTracks = load<TopLists<RankedTrack>>(topTracksJson);

export type HourWeekday = { weekdays: string[]; minutes: number[][] }; // minutes[weekday Mon=0][hour 0-23]
export const getHourWeekday = load<HourWeekday>(hourWeekdayJson);

// --- From the Spotify Web API (pipeline/spotify_fetch.py) ---
export type ApiPlaylist = { id: string; name: string; url: string | null; image: string | null; tracks: number | null; public: boolean | null; mine: boolean };
export type MonthlyPlaylist = ApiPlaylist & { year: number; month: number };
export type ApiArtist = { id: string; name: string; image: string | null; genres: string[]; url: string | null };
export type ApiTrack = { id: string; name: string; artists: string[]; album: string | null; image: string | null; url: string | null };
export type TimeRange = "short_term" | "medium_term" | "long_term";
export type SpotifyApi = {
  fetched_at: string | null;
  monthly_playlists: MonthlyPlaylist[];
  playlists: ApiPlaylist[];
  top: { artists: Partial<Record<TimeRange, ApiArtist[]>>; tracks: Partial<Record<TimeRange, ApiTrack[]>> };
  recent: (ApiTrack & { played_at: string })[];
};
/** Empty until pipeline/spotify_fetch.py has been run. */
export const getSpotifyApi = load<SpotifyApi>(spotifyApiJson);
