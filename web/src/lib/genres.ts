import type { Genres } from "./data";

export type GenreShares = {
  /** minutes per main genre ("French" overlaps, so these add up to more than `classified`) */
  minutes: Record<string, number>;
  /** minutes per electronic subgenre */
  sub: Record<string, number>;
  /** listening time by artists that have a genre (the % base) */
  classified: number;
};

/** Add up genre minutes over a set of months. */
export function genreShares(data: Genres, months: string[]): GenreShares {
  const minutes: Record<string, number> = {};
  const sub: Record<string, number> = {};
  let classified = 0;
  for (const m of months) {
    const total = data.total_by_month?.[m] ?? 0;
    const unclassified = data.by_month[m]?.["Unclassified"] ?? 0;
    classified += total - unclassified;
    for (const [g, v] of Object.entries(data.by_month[m] ?? {})) if (g !== "Unclassified") minutes[g] = (minutes[g] ?? 0) + v;
    for (const [g, v] of Object.entries(data.by_month_electronic?.[m] ?? {})) sub[g] = (sub[g] ?? 0) + v;
  }
  return { minutes, sub, classified: classified || 1 };
}

/** % of classified listening, for main genres and electronic subgenres in one map */
export function percentages(s: GenreShares): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [g, v] of Object.entries(s.minutes)) out[g] = (v / s.classified) * 100;
  for (const [g, v] of Object.entries(s.sub)) out[g] = (v / s.classified) * 100;
  return out;
}
