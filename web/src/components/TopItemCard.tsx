import { formatNumber } from "@/lib/format";
import { Card } from "./Card";

type TopItemCardProps = {
  label: string; // e.g. "Top artist"
  name: string | undefined;
  subtitle?: string; // e.g. the artist of a track
  minutes?: number;
  href?: string;
};

/** Card showing the #1 artist or track for a period. */
export function TopItemCard({ label, name, subtitle, minutes, href }: TopItemCardProps) {
  return (
    <Card href={href}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 truncate text-xl sm:text-2xl font-bold" title={name}>
        {name ?? "—"}
      </p>
      {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
      {minutes != null && <p className="mt-2 text-sm text-accent">{formatNumber(minutes)} min</p>}
    </Card>
  );
}
