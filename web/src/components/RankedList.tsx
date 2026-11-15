import { formatNumber } from "@/lib/format";

type Item = { name: string; subtitle?: string; minutes: number; plays: number; spotifyUrl?: string };

/** Numbered list with a thin bar showing minutes relative to #1. */
export function RankedList({ items, emptyText }: { items: Item[]; emptyText: string }) {
  if (!items.length) return <p className="text-sm text-muted">{emptyText}</p>;
  const max = items[0].minutes || 1;
  return (
    <ol className="space-y-1">
      {items.map((item, i) => (
        <li key={`${item.name}-${item.subtitle ?? ""}`} className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-card-hover">
          <span className="w-6 shrink-0 text-right text-sm tabular-nums text-muted">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate font-semibold" title={item.name}>{item.name}</p>
              <p className="shrink-0 text-sm tabular-nums text-muted">
                <span className="text-foreground">{formatNumber(item.minutes)}</span> min · {formatNumber(item.plays)} plays
              </p>
            </div>
            {item.subtitle && <p className="truncate text-sm text-muted">{item.subtitle}</p>}
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/5">
              <div className="h-1.5 rounded-full bg-accent" style={{ width: `${Math.max((item.minutes / max) * 100, 2)}%` }} />
            </div>
          </div>
          {item.spotifyUrl && (
            <a
              href={item.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-full px-2 py-1 text-xs text-muted opacity-0 transition hover:text-accent group-hover:opacity-100 focus:opacity-100"
              aria-label={`Open ${item.name} in Spotify`}
            >
              Open ↗
            </a>
          )}
        </li>
      ))}
    </ol>
  );
}
