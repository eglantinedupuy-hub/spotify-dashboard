"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/over-time", label: "Over time" },
  { href: "/habits", label: "Habits" },
  { href: "/top", label: "Top" },
  { href: "/playlists", label: "Playlists" },
];

/** Top navigation bar; highlights the current page. */
export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-10 border-b border-white/5 bg-background/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-3">
        <Link href="/" className="mr-4 flex shrink-0 items-center gap-2 font-bold">
          <span className="inline-block h-3 w-3 rounded-full bg-accent" aria-hidden />
          My Listening
        </Link>
        {LINKS.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition ${
                active ? "bg-white text-black" : "text-muted hover:bg-card hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
