import { MapPin } from 'lucide-react';

/** Observed locations across the trip's steps — hidden when nothing was recorded. */
export function HikeTripWaypoints({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-label">points de passage</h2>
      <ul className="flex flex-wrap gap-1.5">
        {labels.map((label, index) => (
          <li key={label}>
            <span className="chip-surface text-data inline-flex items-center gap-1.5 rounded-4xl px-2.5 py-1 text-xs">
              {index === 0 ? (
                <MapPin className="text-primary size-3 shrink-0" strokeWidth={2} aria-hidden />
              ) : null}
              {label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
