"use client";

import type { ZoneBucket } from "@/lib/activity-analysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatZoneTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h${rm.toString().padStart(2, "0")}`;
  }
  return s > 0 ? `${m}'${s.toString().padStart(2, "0")}` : `${m} min`;
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
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-4 overflow-hidden rounded-full bg-muted/40">
          {active.map((z) => (
            <div
              key={z.id}
              style={{
                width: `${z.percent}%`,
                backgroundColor: z.color,
              }}
              title={`${z.label}: ${z.percent}%`}
            />
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {zones.map((z) => (
            <div
              key={z.id}
              className="flex items-center justify-between gap-2 text-xs"
            >
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
                <span className="ml-1 text-muted-foreground">({z.percent}%)</span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
