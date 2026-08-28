import type { CoachDiscussContext } from '@/lib/coach/chat/coach-discuss-context';
import { describeCoachDiscussContext } from '@/lib/coach/chat/coach-discuss-context';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import type { RecordCategory } from '@/lib/training/records';

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

export function buildDiscussIntentKey(params: {
  discussToday: boolean;
  discussGoalId: string | null;
  discussConditionId: string | null;
  discussRecordKey: string | null;
  discussPlanningHorizon: ProjectionHorizonDays | null;
  discussId: string | null;
  discussActivityId: string | null;
}): string | null {
  if (params.discussToday) {
    return 'today';
  }
  if (params.discussGoalId) {
    return `goal:${params.discussGoalId}`;
  }
  if (params.discussConditionId) {
    return `condition:${params.discussConditionId}`;
  }
  if (params.discussRecordKey) {
    return `record:${params.discussRecordKey}`;
  }
  if (params.discussPlanningHorizon) {
    return `planning:${params.discussPlanningHorizon}`;
  }
  if (params.discussId) {
    return `session:${params.discussId}`;
  }
  if (params.discussActivityId) {
    return `activity:${params.discussActivityId}`;
  }
  return null;
}

type DiscussDataSources = {
  discussToday: boolean;
  discussGoalId: string | null;
  discussConditionId: string | null;
  discussRecordKey: string | null;
  discussPlanningHorizon: ProjectionHorizonDays | null;
  discussId: string | null;
  discussActivityId: string | null;
  goals: { id: string; title?: string | null }[];
  physicalNotes: { id: string; title?: string | null }[];
  records: Parameters<typeof findRecordCategory>[0];
  projectionVisible: boolean;
  plannedSessions: { id: string; title?: string | null }[];
  activities: { id: string; title?: string | null }[];
  todayLoaded: boolean;
};

function isGoalReady(sources: DiscussDataSources) {
  return sources.goals.some((g) => g.id === sources.discussGoalId);
}

function isConditionReady(sources: DiscussDataSources) {
  return sources.physicalNotes.some((n) => n.id === sources.discussConditionId);
}

function isRecordReady(sources: DiscussDataSources) {
  return findRecordCategory(sources.records, sources.discussRecordKey!) !== null;
}

function isSessionReady(sources: DiscussDataSources) {
  return sources.plannedSessions.some((s) => s.id === sources.discussId);
}

function isActivityReady(sources: DiscussDataSources) {
  return sources.activities.some((a) => a.id === sources.discussActivityId);
}

export function isDiscussDataReady(sources: DiscussDataSources): boolean {
  if (sources.discussToday) {
    return sources.todayLoaded;
  }
  if (sources.discussGoalId) {
    return isGoalReady(sources);
  }
  if (sources.discussConditionId) {
    return isConditionReady(sources);
  }
  if (sources.discussRecordKey) {
    return isRecordReady(sources);
  }
  if (sources.discussPlanningHorizon) {
    return sources.projectionVisible;
  }
  if (sources.discussId) {
    return isSessionReady(sources);
  }
  if (sources.discussActivityId) {
    return isActivityReady(sources);
  }
  return false;
}

function buildGoalContext(sources: DiscussDataSources): CoachDiscussContext | null {
  if (!sources.discussGoalId) {
    return null;
  }
  const goal = sources.goals.find((g) => g.id === sources.discussGoalId);
  return describeCoachDiscussContext({ kind: 'goal', goalId: sources.discussGoalId }, goal?.title);
}

function buildConditionContext(sources: DiscussDataSources): CoachDiscussContext | null {
  if (!sources.discussConditionId) {
    return null;
  }
  const note = sources.physicalNotes.find((n) => n.id === sources.discussConditionId);
  return describeCoachDiscussContext(
    { kind: 'physical-condition', noteId: sources.discussConditionId },
    note?.title,
  );
}

function buildRecordContext(sources: DiscussDataSources): CoachDiscussContext | null {
  if (!sources.discussRecordKey) {
    return null;
  }
  const found = findRecordCategory(sources.records, sources.discussRecordKey);
  return describeCoachDiscussContext(
    { kind: 'record', categoryKey: sources.discussRecordKey },
    found ? `${found.category.label} · ${found.sportLabel}` : null,
  );
}

function buildSessionContext(sources: DiscussDataSources): CoachDiscussContext | null {
  if (!sources.discussId) {
    return null;
  }
  const session = sources.plannedSessions.find((sn) => sn.id === sources.discussId);
  return describeCoachDiscussContext(
    { kind: 'planned-session', sessionId: sources.discussId },
    session?.title,
  );
}

function buildActivityContext(sources: DiscussDataSources): CoachDiscussContext | null {
  if (!sources.discussActivityId) {
    return null;
  }
  const activity = sources.activities.find((a) => a.id === sources.discussActivityId);
  return describeCoachDiscussContext(
    { kind: 'activity', activityId: sources.discussActivityId },
    activity?.title,
  );
}

export function buildDiscussContext(sources: DiscussDataSources): CoachDiscussContext | null {
  if (sources.discussToday) {
    return describeCoachDiscussContext({ kind: 'today' });
  }
  const goal = buildGoalContext(sources);
  if (goal) {
    return goal;
  }
  const condition = buildConditionContext(sources);
  if (condition) {
    return condition;
  }
  const record = buildRecordContext(sources);
  if (record) {
    return record;
  }
  if (sources.discussPlanningHorizon) {
    return describeCoachDiscussContext({
      kind: 'planning',
      horizonDays: sources.discussPlanningHorizon,
    });
  }
  const session = buildSessionContext(sources);
  if (session) {
    return session;
  }
  return buildActivityContext(sources);
}

export function getDiscussBootstrapKey(sources: DiscussDataSources): string | null {
  if (sources.discussToday) {
    return 'today';
  }
  if (sources.discussGoalId) {
    return `goal:${sources.discussGoalId}`;
  }
  if (sources.discussConditionId) {
    return `condition:${sources.discussConditionId}`;
  }
  if (sources.discussRecordKey) {
    return `record:${sources.discussRecordKey}`;
  }
  if (sources.discussPlanningHorizon) {
    return `planning:${sources.discussPlanningHorizon}`;
  }
  if (sources.discussId) {
    return `session:${sources.discussId}`;
  }
  if (sources.discussActivityId) {
    return `activity:${sources.discussActivityId}`;
  }
  return null;
}

function getDiscussPendingQuery(
  sources: DiscussDataSources & {
    todayPending: boolean;
    goalsPending: boolean;
    physicalNotesPending: boolean;
    recordsPending: boolean;
    projectionPending: boolean;
    plannedPending: boolean;
    activitiesPending: boolean;
  },
): boolean {
  if (sources.discussToday) {
    return sources.todayPending;
  }
  if (sources.discussGoalId) {
    return sources.goalsPending;
  }
  if (sources.discussConditionId) {
    return sources.physicalNotesPending;
  }
  if (sources.discussRecordKey) {
    return sources.recordsPending;
  }
  if (sources.discussPlanningHorizon) {
    return sources.projectionPending;
  }
  if (sources.discussId) {
    return sources.plannedPending;
  }
  if (sources.discussActivityId) {
    return sources.activitiesPending;
  }
  return true;
}

export function isDiscussBootstrapPending(
  sources: DiscussDataSources & {
    todayPending: boolean;
    goalsPending: boolean;
    physicalNotesPending: boolean;
    recordsPending: boolean;
    projectionPending: boolean;
    plannedPending: boolean;
    activitiesPending: boolean;
  },
): boolean {
  if (isDiscussDataReady(sources)) {
    return false;
  }
  return getDiscussPendingQuery(sources);
}
