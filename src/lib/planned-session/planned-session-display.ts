import { formatPlannedSessionRelativeDay } from './planned-session-dates';
import {
  ACTIVITY_COLOR,
  ACTIVITY_LABEL,
  INTENSITY_LABEL,
} from '@/lib/today/today-dashboard-labels';
import type { ClientPlannedSession } from '@/lib/query/types';

const DEFAULT_TYPE_COLOR = 'bg-muted text-muted-foreground';

export type PlannedSessionDisplay = {
  typeLabel: string;
  typeColor: string;
  intensityLabel: string | null;
  dateStr: string;
  title: string;
};

export function resolvePlannedSessionDisplay(
  session: ClientPlannedSession,
  referenceDate: Date = new Date(),
): PlannedSessionDisplay {
  const typeLabel = ACTIVITY_LABEL[session.type] ?? session.type;
  const typeColor = ACTIVITY_COLOR[session.type] ?? DEFAULT_TYPE_COLOR;
  const intensityLabel = session.intensity
    ? (INTENSITY_LABEL[session.intensity] ?? session.intensity)
    : null;
  const dateStr = formatPlannedSessionRelativeDay(session.date, referenceDate);
  const title = session.title?.trim() || typeLabel;

  return { typeLabel, typeColor, intensityLabel, dateStr, title };
}

/** Safe location line for read views — never renders the string "null". */
export function formatPlannedSessionLocationDisplay(
  locationLabel: string | null | undefined,
  exposureLabel: string,
): string {
  const label = typeof locationLabel === 'string' ? locationLabel.trim() : '';
  if (!label || label === 'null') return exposureLabel;
  return `${label} · ${exposureLabel}`;
}
