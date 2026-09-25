import { ActivityType } from '@prisma/client';
import { format as formatDateFns, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : parseISO(value);
}

/**
 * Compact day span — “1 – 6 août 2026”, collapsing the month when both ends
 * share it. Drops the weekday, which is noise once a range spans days.
 */
export function formatDayRange(start: Date | string, end: Date | string): string {
  const from = asDate(start);
  const to = asDate(end);
  const fullEnd = formatDateFns(to, 'd MMM yyyy', { locale: fr });

  if (from.getTime() === to.getTime()) {
    return fullEnd;
  }

  const sameMonth = from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth();
  return sameMonth
    ? `${formatDateFns(from, 'd', { locale: fr })} – ${fullEnd}`
    : `${formatDateFns(from, 'd MMM', { locale: fr })} – ${fullEnd}`;
}

export function formatDuration(seconds?: number | null): string {
  if (!seconds) {
    return '—';
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h}h${m.toString().padStart(2, '0')}`;
  }
  return `${m} min`;
}

/** Format mm:ss pour séries chronométrées (muscu, étirements). */
export function formatClockDuration(seconds?: number | null): string {
  if (!seconds) {
    return '—';
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatPace(secPerKm?: number | null): string {
  if (!secPerKm) {
    return '—';
  }
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${s.toString().padStart(2, '0')}/km`;
}

export function formatSwimPace(secPer100m?: number | null): string {
  if (!secPer100m) {
    return '—';
  }
  const m = Math.floor(secPer100m / 60);
  const s = Math.round(secPer100m % 60);
  return `${m}:${s.toString().padStart(2, '0')}/100m`;
}

export function formatDistance(meters?: number | null): string {
  if (!meters) {
    return '—';
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (date === undefined || date === null) {
    return '—';
  }
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(value);
}

export function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const activityTypeLabels: Record<ActivityType, string> = {
  RUN: 'Course',
  BIKE: 'Vélo',
  SWIM: 'Natation',
  STRENGTH: 'Musculation',
  TRIATHLON: 'Triathlon',
  HIKE: 'Randonnée',
  OTHER: 'Autre',
};

/** @deprecated Prefer `SPORT_IDENTITY_TEXT` from `@/lib/activity/sport-identity`. */
export { SPORT_IDENTITY_TEXT as activityTypeColors } from '@/lib/activity/sport-identity';
