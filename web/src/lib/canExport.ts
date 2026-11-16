/**
 * Playlist export buttons only exist when the site runs on my computer (`npm run dev`):
 * they use my saved Spotify login in data/raw/cache, which never leaves my machine.
 * On Vercel (production) the buttons are hidden and the API route answers 404.
 */
export const canExport = process.env.NODE_ENV === "development";
