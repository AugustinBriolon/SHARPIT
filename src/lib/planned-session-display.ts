import { formatPlannedSessionRelativeDay } from '@/lib/planned-session-dates';
import { ACTIVITY_COLOR, ACTIVITY_LABEL, INTENSITY_LABEL } from '@/lib/today-dashboard-labels';
import type { ClientPlannedSession } from '@/lib/query/types';

const DEFAULT_TYPE_COLOR = 'bg-slate-100 text-slate-600 dark:bg-slate-800';

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
