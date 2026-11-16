// POST /api/export-playlist  { name, description?, trackIds: string[], public?: boolean }  ->  { url, added }
// Creates a playlist on MY Spotify account. Local only: uses the login saved by pipeline/spotify_fetch.py
// (data/raw/cache/spotify_token.json) and SPOTIFY_CLIENT_ID from the project's .env. Disabled in production.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { canExport } from "@/lib/canExport";

const ROOT = path.resolve(process.cwd(), ".."); // `npm run dev` runs in web/
const TOKEN_FILE = path.join(ROOT, "data", "raw", "cache", "spotify_token.json");
const API = "https://api.spotify.com/v1";

async function clientId(): Promise<string | undefined> {
  if (process.env.SPOTIFY_CLIENT_ID) return process.env.SPOTIFY_CLIENT_ID.trim();
  const env = await readFile(path.join(ROOT, ".env"), "utf8").catch(() => "");
  const line = env.split(/\r?\n/).find((l) => l.trim().startsWith("SPOTIFY_CLIENT_ID="));
  return line?.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "") || undefined;
}

/** Refresh the saved login (PKCE: no client secret needed). */
async function accessToken(): Promise<string> {
  const saved = JSON.parse(await readFile(TOKEN_FILE, "utf8").catch(() => "{}"));
  const id = await clientId();
  if (!saved.refresh_token || !id) throw new Error("No saved Spotify login — run python pipeline/spotify_fetch.py first.");
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: saved.refresh_token, client_id: id }),
  });
  if (!r.ok) throw new Error("Spotify login expired — run python pipeline/spotify_fetch.py to log in again.");
  const tok = await r.json();
  if (tok.refresh_token && tok.refresh_token !== saved.refresh_token) {
    // Spotify can rotate the refresh token; keep the new one so the Python scripts keep working
    await writeFile(TOKEN_FILE, JSON.stringify({ ...saved, refresh_token: tok.refresh_token }));
  }
  return tok.access_token;
}

async function spotify(token: string, url: string, body: unknown) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(API + url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.status === 429) {
      await new Promise((ok) => setTimeout(ok, (Number(r.headers.get("Retry-After")) || 2) * 1000 + 500));
      continue;
    }
    if (!r.ok) throw new Error(`Spotify said ${r.status} on ${url}${r.status === 403 ? " (missing permission? re-run spotify_fetch.py)" : ""}`);
    return r.json();
  }
  throw new Error("Spotify kept rate-limiting, try again in a minute.");
}

export async function POST(req: Request) {
  if (!canExport) return new NextResponse("Not found", { status: 404 });
  try {
    const { name, description, trackIds, public: isPublic } = await req.json();
    const ids: string[] = [...new Set((trackIds ?? []).filter((t: unknown) => typeof t === "string" && /^[A-Za-z0-9]{22}$/.test(t)))] as string[];
    if (!name || !ids.length) return NextResponse.json({ error: "Give the playlist a name and at least one song." }, { status: 400 });
    if (ids.length > 2000) return NextResponse.json({ error: "That's a lot of songs — keep it under 2,000." }, { status: 400 });

    const token = await accessToken();
    const playlist = await spotify(token, "/me/playlists", { name: String(name).slice(0, 100), description: description ?? "", public: !!isPublic });
    for (let i = 0; i < ids.length; i += 100) {
      await spotify(token, `/playlists/${playlist.id}/items`, { uris: ids.slice(i, i + 100).map((id) => `spotify:track:${id}`) });
    }
    return NextResponse.json({ url: playlist.external_urls?.spotify, added: ids.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Something went wrong." }, { status: 500 });
  }
}
