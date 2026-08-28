import { formatDate, formatDistance, formatDuration } from '@/lib/format';
import type { HikeOvernightSummary } from '@/lib/activity/hike/hike-overnight-summary';
import { formatTrainingLoad } from '@/lib/preferences/display-mode';

function formatRange(start: Date, end: Date): string {
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  const t = (d: Date) =>
    new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(d);
  if (sameDay) {
    return `${formatDate(start)} · ${t(start)} → ${t(end)}`;
  }
  return `${formatDate(start)} ${t(start)} → ${formatDate(end)} ${t(end)}`;
}

function pushDistanceRows(rows: { label: string; value: string }[], summary: HikeOvernightSummary) {
  if (summary.durationSec !== null) {
    rows.push({ label: 'Durée', value: formatDuration(summary.durationSec) });
  }
  if (summary.distanceM !== null) {
    rows.push({ label: 'Distance', value: formatDistance(summary.distanceM) });
  }
}

function pushElevationRows(
  rows: { label: string; value: string }[],
  summary: HikeOvernightSummary,
) {
  if (summary.elevationM !== null) {
    rows.push({ label: 'D+', value: `${Math.round(summary.elevationM)} m` });
  }
  if (summary.elevationLossM !== null) {
    rows.push({ label: 'D−', value: `${Math.round(summary.elevationLossM)} m` });
  }
}

function pushContextRows(
  rows: { label: string; value: string }[],
  summary: HikeOvernightSummary,
  mode: 'essential' | 'expert',
) {
  if (summary.locationLabel) {
    rows.push({ label: 'Lieu', value: summary.locationLabel });
  }
  if (summary.weather) {
    rows.push({ label: 'Météo', value: summary.weather });
  }
  if (summary.load !== null) {
    rows.push({ label: 'Charge', value: formatTrainingLoad(summary.load, mode) });
  }
}

function pushEndRow(rows: { label: string; value: string }[], summary: HikeOvernightSummary) {
  const endLabel =
    summary.endPoint !== null
      ? `${summary.endPoint.lat.toFixed(4)}, ${summary.endPoint.lng.toFixed(4)}`
      : summary.endLocationFallback;
  if (endLabel) {
    rows.push({ label: 'Fin de parcours', value: endLabel });
  }
}

export function buildOvernightPanelRows(
  summary: HikeOvernightSummary,
  mode: 'essential' | 'expert',
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [
    { label: 'Fenêtre', value: formatRange(summary.startAt, summary.endAt) },
  ];
  pushDistanceRows(rows, summary);
  pushElevationRows(rows, summary);
  pushContextRows(rows, summary, mode);
  pushEndRow(rows, summary);
  return rows;
}
