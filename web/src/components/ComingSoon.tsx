import { Card } from "./Card";

/** Placeholder for pages that aren't built yet. */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{title}</h1>
      <Card>
        <p className="text-muted">{description}</p>
        <p className="mt-3 text-sm text-accent">Coming soon</p>
      </Card>
    </div>
  );
}
