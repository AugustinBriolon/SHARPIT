import { formatDate, formatDistance, formatDuration } from '@/lib/format';
import type { HikeOvernightSummary } from '@/lib/activity/hike/hike-overnight-summary';
import { SPORT_IDENTITY_PANEL } from '@/lib/activity/sport-identity';
import { ActivityType } from '@prisma/client';
import { cn } from '@/lib/utils';

function formatRange(start: Date, end: Date): string {
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  const t = (d: Date) =>
    new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(d);
  if (sameDay) return `${formatDate(start)} · ${t(start)} → ${t(end)}`;
  return `${formatDate(start)} ${t(start)} → ${formatDate(end)} ${t(end)}`;
}

export function ActivityHikeOvernightPanel({ summary }: { summary: HikeOvernightSummary }) {
  // Day hikes already surface metrics in hero + specs — panel is overnight-only.
  if (summary.variant !== 'overnight') return null;

  const rows: { label: string; value: string }[] = [];
  rows.push({ label: 'Fenêtre', value: formatRange(summary.startAt, summary.endAt) });
  if (summary.durationSec != null) {
    rows.push({ label: 'Durée', value: formatDuration(summary.durationSec) });
  }
  if (summary.distanceM != null) {
    rows.push({ label: 'Distance', value: formatDistance(summary.distanceM) });
  }
  if (summary.elevationM != null) {
    rows.push({ label: 'D+', value: `${Math.round(summary.elevationM)} m` });
  }
  if (summary.elevationLossM != null) {
    rows.push({ label: 'D−', value: `${Math.round(summary.elevationLossM)} m` });
  }
  if (summary.locationLabel) rows.push({ label: 'Lieu', value: summary.locationLabel });
  if (summary.weather) rows.push({ label: 'Météo', value: summary.weather });
  if (summary.load != null)
    rows.push({ label: 'Charge', value: `${Math.round(summary.load)} TSS` });
  const endLabel =
    summary.endPoint != null
      ? `${summary.endPoint.lat.toFixed(4)}, ${summary.endPoint.lng.toFixed(4)}`
      : summary.endLocationFallback;
  if (endLabel) rows.push({ label: 'Fin de parcours', value: endLabel });

  if (rows.length === 0) return null;

  return (
    <section
      aria-label="Nuitée"
      className={cn('analysis-panel space-y-3 border p-4', SPORT_IDENTITY_PANEL[ActivityType.HIKE])}
    >
      <h2 className="text-section-title">Nuitée</h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-label text-muted-foreground">{row.label}</dt>
            <dd className="text-data mt-1 truncate">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
