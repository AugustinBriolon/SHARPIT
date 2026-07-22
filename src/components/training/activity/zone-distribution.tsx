'use client';

import type { ZoneBucket } from '@/lib/activity/activity-analysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/40 flex h-4 overflow-hidden rounded-full">
          {active.map((z) => (
            <div
              key={z.id}
              title={`${z.label}: ${z.percent}%`}
              style={{
                width: `${z.percent}%`,
                backgroundColor: z.color,
              }}
            />
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {zones.map((z) => (
            <div key={z.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: z.color }}
                />
                <span className="text-muted-foreground">
                  {z.shortLabel} {z.label}
                </span>
              </span>
              <span className="font-mono tabular-nums">
                {formatZoneTime(z.seconds)}
                <span className="text-muted-foreground ml-1">({z.percent}%)</span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
