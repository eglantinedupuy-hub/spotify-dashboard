"use client";

import { useEffect } from "react";

const WEB = /^https:\/\/open\.spotify\.com\/(track|album|artist|playlist)\/([A-Za-z0-9]{22})/;

/**
 * Makes every open.spotify.com link on the site open in the Spotify desktop app when it's installed.
 * Click -> try the app (spotify:track:… link). If the browser doesn't hand off to the app within ~1.5 s
 * (no "Open Spotify?" prompt, page never loses focus), open the normal web player link instead.
 * Phones are left alone: there the web link already opens the app.
 */
export function OpenInSpotifyApp() {
  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) return;

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let ctrl-click etc. open a tab
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      const m = a?.href.match(WEB);
      if (!a || !m) return;
      e.preventDefault();

      let handedOff = false;
      const markHandedOff = () => { handedOff = true; };
      window.addEventListener("blur", markHandedOff, { once: true });
      document.addEventListener("visibilitychange", markHandedOff, { once: true });
      window.location.href = `spotify:${m[1]}:${m[2]}`;
      setTimeout(() => {
        window.removeEventListener("blur", markHandedOff);
        document.removeEventListener("visibilitychange", markHandedOff);
        if (!handedOff) window.open(a.href, "_blank", "noopener,noreferrer"); // no app: web player
      }, 1500);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
