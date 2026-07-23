'use client';

import type { ZoneBucket } from '@/lib/activity/activity-analysis';

function formatZoneTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h${rm.toString().padStart(2, '0')}`;
  }
  return s > 0 ? `${m}'${s.toString().padStart(2, '0')}` : `${m} min`;
}

export function ZoneDistribution({
  title,
  subtitle,
  zones,
}: {
  title: string;
  subtitle?: string;
  zones: ZoneBucket[];
}) {
  const active = zones.filter((z) => z.seconds > 0);
  if (!active.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-0.5">
        <p className="text-label">{title}</p>
        {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        {active.map((z) => (
          <div
            key={z.id}
            className="grid grid-cols-[28px_1fr_auto] items-center gap-2"
            title={`${z.label}: ${z.percent}%`}
          >
            <span className="text-data text-muted-foreground text-[11px]">{z.shortLabel}</span>
            <span className="bg-secondary block h-2.5 overflow-hidden rounded-full">
              <span
                className="block h-full rounded-full"
                style={{ width: `${z.percent}%`, backgroundColor: z.color }}
              />
            </span>
            <span className="text-data text-muted-foreground text-right text-[11px] tabular-nums">
              {formatZoneTime(z.seconds)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
