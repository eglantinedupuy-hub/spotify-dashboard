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
import genresJson from "@/data/genres.json";
import libraryJson from "@/data/library.json";
import personasJson from "@/data/personas.json";

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

// --- Genres from Last.fm tags (pipeline/lastfm_genres.py) ---
export type GenreTop = { artists: { name: string; minutes: number }[]; tracks: { name: string; artist: string; minutes: number; track_id?: string | null }[] };
export type Genres = {
  source: string;
  genres: string[]; // main genres, in display order ("French" overlaps with the others)
  electronic_subgenres: string[];
  by_month: Record<string, Record<string, number>>; // "2024-05" -> genre -> minutes (+ "Unclassified")
  by_month_electronic: Record<string, Record<string, number>>; // "2024-05" -> electronic subgenre -> minutes
  total_by_month: Record<string, number>;
  artists: Record<string, { g: string; sub?: string; fr?: boolean }>; // my top 1,000 artists
  top_by_genre: Record<string, Record<string, GenreTop>>; // genre or subgenre -> "all" | "2024" -> top lists
  coverage: number;
  min_plays: number;
};
export const getGenres = load<Genres>(genresJson);

// --- Liked but never played (pipeline/library_check.py) ---
export type LibraryTrack = ApiTrack & {
  added_at: string | null;
  plays: number;
  starts?: number; // times I started it (any length)
  skips?: number; // starts I stopped before 30 s
  last_played: string | null;
  genre?: string | null; // main genre of the first artist (Last.fm)
  style?: string | null; // electronic subgenre
  french?: boolean;
  playlists?: string[]; // playlist songs only: which of my playlists it's in
  liked?: boolean;
};
export type BarelyPlaylist = { id: string; name: string; url: string | null; image: string | null; tracks: number; played_pct: number };
export type Library = {
  liked_total: number;
  followed_total: number;
  playlists_read?: number;
  barely?: number;
  liked_never_played: LibraryTrack[];
  liked_barely_played: LibraryTrack[];
  playlist_unplayed?: LibraryTrack[];
  playlists_barely_listened?: BarelyPlaylist[];
  followed_barely_listened: (Omit<ApiArtist, "genres"> & { minutes: number })[];
};
export const getLibrary = load<Library>(libraryJson);

// --- Listener personas (pipeline/personas.py) ---
export type PersonaFit = { id: string; title: string; adj: string; description: string; stat: string; value: number; threshold: number; fit: number };
export type PersonaProfile = {
  name: string; // e.g. "Night-owl Loyalist"
  when: PersonaFit[]; // best fit first
  how: PersonaFit[];
  fits: boolean; // false = closest match only
  stats: Record<string, number | null>;
  from: string;
  to: string;
};
export type Personas = {
  now: PersonaProfile | null; // last 12 months
  all_time: PersonaProfile | null;
  by_year: Record<string, string>;
  stat_labels: Record<string, string>;
};
/** Empty until pipeline/personas.py has been run. */
export const getPersonas = load<Personas>(personasJson);
