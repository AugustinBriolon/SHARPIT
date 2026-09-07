import { describeCoachDiscussContext } from '@/lib/coach/chat/discuss/coach-discuss-context';
import type { CoachDiscussContext } from '@/lib/coach/chat/discuss/coach-discuss-context';
import type { ClientActivity } from '@/lib/query/types';

export type CoachContextPresetId = 'today' | 'last-activity' | 'form-7d' | 'week';

export type CoachContextPreset = {
  id: CoachContextPresetId;
  label: string;
  /** When false, option stays listed but cannot attach (e.g. no last activity). */
  available: boolean;
  context: CoachDiscussContext | null;
};

function activityTime(activity: ClientActivity): number {
  const value = activity.date;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function resolveLatestActivity(
  activities: readonly ClientActivity[],
): ClientActivity | null {
  if (activities.length === 0) {
    return null;
  }
  let latest = activities[0]!;
  let latestTs = activityTime(latest);
  for (let i = 1; i < activities.length; i += 1) {
    const candidate = activities[i]!;
    const ts = activityTime(candidate);
    if (ts > latestTs) {
      latest = candidate;
      latestTs = ts;
    }
  }
  return latest;
}

export function buildCoachContextPresets(
  activities: readonly ClientActivity[],
): CoachContextPreset[] {
  const latest = resolveLatestActivity(activities);
  const lastActivityContext = latest
    ? describeCoachDiscussContext(
        { kind: 'activity', activityId: latest.id },
        latest.title?.trim() || null,
      )
    : null;

  const weekContext = describeCoachDiscussContext({ kind: 'planning', horizonDays: 7 });
  const formContext: CoachDiscussContext = {
    ...weekContext,
    label: 'Forme · 7 jours',
  };

  return [
    {
      id: 'today',
      label: 'État du jour',
      available: true,
      context: describeCoachDiscussContext({ kind: 'today' }),
    },
    {
      id: 'last-activity',
      label: 'Dernière séance',
      available: lastActivityContext !== null,
      context: lastActivityContext,
    },
    {
      id: 'form-7d',
      label: 'Forme 7 jours',
      available: true,
      context: formContext,
    },
    {
      id: 'week',
      label: 'Semaine',
      available: true,
      context: weekContext,
    },
  ];
}

export function presetMatchesAttached(
  preset: CoachContextPreset,
  attached: CoachDiscussContext | null,
): boolean {
  if (!attached || !preset.context) {
    return false;
  }
  return preset.context.kind === attached.kind && preset.context.label === attached.label;
}
