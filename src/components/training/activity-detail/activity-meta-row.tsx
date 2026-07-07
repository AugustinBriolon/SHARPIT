import { PlannedSessionLinkCard } from '@/components/training/planned-session-link-card';
import { ActivityContextChips } from './activity-context-chips';
import type { ActivityDetail } from './types';

export function ActivityMetaRow({ activity }: { activity: ActivityDetail }) {
  const hasContext =
    activity.rpe != null || activity.feeling || activity.weather || activity.plannedSession;

  if (!hasContext) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ActivityContextChips activity={activity} />
      {activity.plannedSession && (
        <PlannedSessionLinkCard plannedSession={activity.plannedSession} variant="inline" />
      )}
    </div>
  );
}
