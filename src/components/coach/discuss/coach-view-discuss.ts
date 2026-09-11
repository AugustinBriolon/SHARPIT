import type { CoachDiscussContext } from '@/lib/coach/chat/discuss/coach-discuss-context';
import {
  describeCoachDiscussContext,
  enrichDiscussContextWithActivityStatus,
} from '@/lib/coach/chat/discuss/coach-discuss-context';
import type { CoachDiscussTarget } from '@/lib/coach/chat/discuss/coach-discuss-href';
import { ACTIVITY_STATUS_DEFAULT, readActivityStatusStore } from '@/lib/health/activity-status';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import type { RecordCategory } from '@/lib/training/records/records';

const RECORD_SPORT_LABEL = { run: 'course', bike: 'vélo', swim: 'natation' } as const;

export function findRecordCategory(
  payload:
    { prs: { run: RecordCategory[]; bike: RecordCategory[]; swim: RecordCategory[] } } | undefined,
  key: string,
): { category: RecordCategory; sportLabel: string } | null {
  if (!payload) {
    return null;
  }
  for (const sport of ['run', 'bike', 'swim'] as const) {
    const category = payload.prs[sport].find((c) => c.key === key);
    if (category) {
      return { category, sportLabel: RECORD_SPORT_LABEL[sport] };
    }
  }
  return null;
}

type DiscussParams = {
  discussToday: boolean;
  discussJournalAnalyses: boolean;
  discussGoalId: string | null;
  discussConditionId: string | null;
  discussRecordKey: string | null;
  discussPlanningHorizon: ProjectionHorizonDays | null;
  discussId: string | null;
  discussActivityId: string | null;
};

type DiscussIntent = { key: string; target: CoachDiscussTarget };
type IntentResolver = (params: DiscussParams) => DiscussIntent | null;

/** Deep-link params in precedence order — the first one set names the conversation. */
const INTENT_RESOLVERS: readonly IntentResolver[] = [
  (p) => (p.discussToday ? { key: 'today', target: { kind: 'today' } } : null),
  (p) =>
    p.discussJournalAnalyses
      ? { key: 'journal-analyses', target: { kind: 'journal-analyses' } }
      : null,
  (p) =>
    p.discussGoalId
      ? { key: `goal:${p.discussGoalId}`, target: { kind: 'goal', goalId: p.discussGoalId } }
      : null,
  (p) =>
    p.discussConditionId
      ? {
          key: `condition:${p.discussConditionId}`,
          target: { kind: 'physical-condition', noteId: p.discussConditionId },
        }
      : null,
  (p) =>
    p.discussRecordKey
      ? {
          key: `record:${p.discussRecordKey}`,
          target: { kind: 'record', categoryKey: p.discussRecordKey },
        }
      : null,
  (p) =>
    p.discussPlanningHorizon
      ? {
          key: `planning:${p.discussPlanningHorizon}`,
          target: { kind: 'planning', horizonDays: p.discussPlanningHorizon },
        }
      : null,
  (p) =>
    p.discussId
      ? {
          key: `session:${p.discussId}`,
          target: { kind: 'planned-session', sessionId: p.discussId },
        }
      : null,
  (p) =>
    p.discussActivityId
      ? {
          key: `activity:${p.discussActivityId}`,
          target: { kind: 'activity', activityId: p.discussActivityId },
        }
      : null,
];

export function resolveDiscussIntent(params: DiscussParams): DiscussIntent | null {
  for (const resolveIntent of INTENT_RESOLVERS) {
    const intent = resolveIntent(params);
    if (intent) {
      return intent;
    }
  }
  return null;
}

export function buildDiscussIntentKey(params: DiscussParams): string | null {
  return resolveDiscussIntent(params)?.key ?? null;
}

type DiscussDataSources = DiscussParams & {
  goals: { id: string; title?: string | null }[];
  physicalNotes: { id: string; title?: string | null }[];
  records: Parameters<typeof findRecordCategory>[0];
  projectionVisible: boolean;
  plannedSessions: { id: string; title?: string | null }[];
  activities: { id: string; title?: string | null }[];
  todayLoaded: boolean;
};

type DiscussPendingFlags = {
  todayPending: boolean;
  goalsPending: boolean;
  physicalNotesPending: boolean;
  recordsPending: boolean;
  projectionPending: boolean;
  plannedPending: boolean;
  activitiesPending: boolean;
};

type PerKind<R> = {
  [K in CoachDiscussTarget['kind']]: (
    sources: DiscussDataSources,
    target: Extract<CoachDiscussTarget, { kind: K }>,
  ) => R;
};

function forTarget<R>(
  table: PerKind<R>,
  sources: DiscussDataSources,
  target: CoachDiscussTarget,
): R {
  // Correlated union: TS cannot tie the looked-up entry to this target's kind.
  const run = table[target.kind] as (s: DiscussDataSources, t: CoachDiscussTarget) => R;
  return run(sources, target);
}

/** Whether the data naming the target has arrived. */
const TARGET_DATA_READY: PerKind<boolean> = {
  today: (s) => s.todayLoaded,
  'journal-analyses': () => true,
  goal: (s, t) => s.goals.some((g) => g.id === t.goalId),
  'physical-condition': (s, t) => s.physicalNotes.some((n) => n.id === t.noteId),
  record: (s, t) => findRecordCategory(s.records, t.categoryKey) !== null,
  planning: (s) => s.projectionVisible,
  'planned-session': (s, t) => s.plannedSessions.some((sn) => sn.id === t.sessionId),
  activity: (s, t) => s.activities.some((a) => a.id === t.activityId),
};

/** Human name of the target for the chip, when the surface has one. */
const TARGET_NAME: PerKind<string | null | undefined> = {
  today: () => null,
  'journal-analyses': () => null,
  goal: (s, t) => s.goals.find((g) => g.id === t.goalId)?.title,
  'physical-condition': (s, t) => s.physicalNotes.find((n) => n.id === t.noteId)?.title,
  record: (s, t) => {
    const found = findRecordCategory(s.records, t.categoryKey);
    return found ? `${found.category.label} · ${found.sportLabel}` : null;
  },
  planning: () => null,
  'planned-session': (s, t) => s.plannedSessions.find((sn) => sn.id === t.sessionId)?.title,
  activity: (s, t) => s.activities.find((a) => a.id === t.activityId)?.title,
};

/** Query whose loading state gates the bootstrap; journal analyses needs none. */
const TARGET_PENDING_FLAG: Record<CoachDiscussTarget['kind'], keyof DiscussPendingFlags | null> = {
  today: 'todayPending',
  'journal-analyses': null,
  goal: 'goalsPending',
  'physical-condition': 'physicalNotesPending',
  record: 'recordsPending',
  planning: 'projectionPending',
  'planned-session': 'plannedPending',
  activity: 'activitiesPending',
};

export function isDiscussDataReady(sources: DiscussDataSources): boolean {
  const intent = resolveDiscussIntent(sources);
  return intent ? forTarget(TARGET_DATA_READY, sources, intent.target) : false;
}

export function buildDiscussContext(sources: DiscussDataSources): CoachDiscussContext | null {
  const intent = resolveDiscussIntent(sources);
  if (!intent) {
    return null;
  }
  const activityStatus =
    typeof window !== 'undefined' ? readActivityStatusStore().status : ACTIVITY_STATUS_DEFAULT;
  const name = forTarget(TARGET_NAME, sources, intent.target);
  return enrichDiscussContextWithActivityStatus(
    describeCoachDiscussContext(intent.target, name),
    activityStatus,
  );
}

export function isDiscussBootstrapPending(
  sources: DiscussDataSources & DiscussPendingFlags,
): boolean {
  const intent = resolveDiscussIntent(sources);
  if (!intent) {
    return true;
  }
  if (forTarget(TARGET_DATA_READY, sources, intent.target)) {
    return false;
  }
  const flag = TARGET_PENDING_FLAG[intent.target.kind];
  return flag ? sources[flag] : false;
}
