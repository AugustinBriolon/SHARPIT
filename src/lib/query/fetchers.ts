import type { RecordsPayload } from '@/lib/records';
import type { ActivityStreamPayload, MultisportStreamsPayload } from '@/lib/streams';
import type {
  ClientActivity,
  ClientGoal,
  ClientHealthEntry,
  ClientBodyCompositionEntry,
  ClientPhysicalNote,
  ClientPlannedSession,
  ClientPlanWeek,
  ClientThresholdSnapshot,
  ClientTrainingPlan,
} from './types';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Requête échouée (${res.status}) sur ${url}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Représentation « sur le fil » d'un type client : les `Date` deviennent des
 * `string` (JSON), récursivement. Typer le payload reçu avec `Serialized<T>` puis
 * réhydrater les champs date donne un résultat structurellement égal à `T`, sans
 * aucun cast `as unknown as` (les erreurs de mapping redeviennent visibles).
 */
type Serialized<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;

function toDate(value: string): Date {
  return new Date(value);
}

function toDateOrNull(value: string | null): Date | null {
  return value == null ? null : new Date(value);
}

export async function fetchActivities(): Promise<ClientActivity[]> {
  const data = await fetchJson<Serialized<ClientActivity>[]>('/api/activities');
  return data.map((a) => ({
    ...a,
    date: toDate(a.date),
    createdAt: toDate(a.createdAt),
    updatedAt: toDate(a.updatedAt),
    plannedSession: a.plannedSession
      ? {
          ...a.plannedSession,
          date: toDate(a.plannedSession.date),
          analyzedAt: toDateOrNull(a.plannedSession.analyzedAt),
        }
      : null,
  }));
}

export async function fetchHealthEntries(
  days: number,
  refDate?: string,
): Promise<ClientHealthEntry[]> {
  const suffix = refDate ? `&date=${encodeURIComponent(refDate)}` : '';
  const data = await fetchJson<Serialized<ClientHealthEntry>[]>(
    `/api/health?days=${days}${suffix}`,
  );
  return data.map((h) => ({
    ...h,
    date: toDate(h.date),
    createdAt: toDate(h.createdAt),
    updatedAt: toDate(h.updatedAt),
  }));
}

export async function fetchBodyCompositionEntries(
  days?: number,
): Promise<ClientBodyCompositionEntry[]> {
  const url = days != null ? `/api/body-composition?days=${days}` : '/api/body-composition';
  const data = await fetchJson<Serialized<ClientBodyCompositionEntry>[]>(url);
  return data.map((entry) => ({
    ...entry,
    measuredAt: toDate(entry.measuredAt),
    createdAt: toDate(entry.createdAt),
    updatedAt: toDate(entry.updatedAt),
  }));
}

export async function fetchGoals(): Promise<ClientGoal[]> {
  const data = await fetchJson<Serialized<ClientGoal>[]>('/api/goals');
  return data.map((g) => ({
    ...g,
    targetDate: toDateOrNull(g.targetDate),
    lastAchievedAt: toDateOrNull((g as { lastAchievedAt?: string | null }).lastAchievedAt),
    createdAt: toDate(g.createdAt),
    updatedAt: toDate(g.updatedAt),
  }));
}

export interface ClientGoalAchievement {
  id: string;
  goalId: string;
  activityId: string | null;
  source: string;
  value: number | null;
  targetValue: number | null;
  periodKey: string;
  achievedAt: Date;
  goal: {
    id: string;
    title: string;
    unit: string | null;
    metricKey: string | null;
    kind: string;
  };
  activity: {
    id: string;
    title: string | null;
    type: string;
    date: Date;
  } | null;
}

export async function fetchGoalAchievements(limit = 20): Promise<ClientGoalAchievement[]> {
  const data = await fetchJson<Serialized<ClientGoalAchievement>[]>(
    `/api/goals/achievements?limit=${limit}`,
  );
  return data.map((a) => ({
    ...a,
    achievedAt: toDate(a.achievedAt),
    activity: a.activity ? { ...a.activity, date: toDate(a.activity.date) } : null,
  }));
}

export async function fetchPlannedSessions(): Promise<ClientPlannedSession[]> {
  const data = await fetchJson<Serialized<ClientPlannedSession>[]>('/api/planned-sessions');
  return data.map((s) => ({
    ...s,
    date: toDate(s.date),
    createdAt: toDate(s.createdAt),
    updatedAt: toDate(s.updatedAt),
    analyzedAt: toDateOrNull(s.analyzedAt),
    activity: s.activity
      ? {
          ...s.activity,
          date: toDate(s.activity.date),
          createdAt: toDate(s.activity.createdAt),
          updatedAt: toDate(s.activity.updatedAt),
          plannedSession: s.activity.plannedSession
            ? {
                ...s.activity.plannedSession,
                date: toDate(s.activity.plannedSession.date),
                analyzedAt: toDateOrNull(s.activity.plannedSession.analyzedAt),
              }
            : null,
        }
      : null,
  }));
}

export async function fetchActivityStream(id: string): Promise<ActivityStreamPayload> {
  return fetchJson<ActivityStreamPayload>(`/api/activities/${id}/streams`);
}

export async function fetchMultisportStreams(id: string): Promise<MultisportStreamsPayload> {
  return fetchJson<MultisportStreamsPayload>(`/api/activities/${id}/multisport-streams`);
}

export async function fetchRecords(): Promise<RecordsPayload> {
  return fetchJson<RecordsPayload>('/api/records');
}

export interface AthleteProfilePayload {
  heightCm: number | null;
  birthDate: string | null;
  ftpW: number | null;
  maxHr: number | null;
  lthr: number | null;
  runThresholdPaceSecPerKm: number | null;
  sleepTargetMinutes: number | null;
  sleepBedtimeTargetMin: number | null;
}

export async function fetchAthleteProfile(): Promise<AthleteProfilePayload> {
  return fetchJson<AthleteProfilePayload>('/api/athlete-profile');
}

export interface GoogleCalendarEvent {
  id: string;
  calendarId: string;
  calendarName: string;
  color: string | null;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
}

export async function fetchGoogleEvents(
  from: string,
  to: string,
): Promise<{ connected: boolean; events: GoogleCalendarEvent[] }> {
  return fetchJson(
    `/api/google/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
}

export interface GoogleCalendarInfo {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor: string | null;
  hidden: boolean;
  isTarget: boolean;
}

export async function fetchGoogleCalendars(): Promise<GoogleCalendarInfo[]> {
  return fetchJson<GoogleCalendarInfo[]>('/api/google/calendars');
}

export async function fetchPhysicalNotes(): Promise<ClientPhysicalNote[]> {
  const data = await fetchJson<Serialized<ClientPhysicalNote>[]>('/api/physical-notes');
  return data.map((n) => ({
    ...n,
    startDate: toDate(n.startDate),
    resolvedAt: toDateOrNull(n.resolvedAt),
    createdAt: toDate(n.createdAt),
    updatedAt: toDate(n.updatedAt),
    checkins: (n.checkins ?? []).map((c) => ({
      ...c,
      date: toDate(c.date),
      createdAt: toDate(c.createdAt),
    })),
  }));
}

export interface ClientConversationSummary {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientConversation extends ClientConversationSummary {
  messages: unknown;
}

export async function fetchConversations(): Promise<ClientConversationSummary[]> {
  const data = await fetchJson<Serialized<ClientConversationSummary>[]>('/api/coach/conversations');
  return data.map((c) => ({
    id: c.id,
    title: c.title,
    createdAt: toDate(c.createdAt),
    updatedAt: toDate(c.updatedAt),
  }));
}

export async function fetchConversation(id: string): Promise<ClientConversation> {
  const c = await fetchJson<Serialized<ClientConversation>>(`/api/coach/conversations/${id}`);
  return {
    id: c.id,
    title: c.title,
    messages: c.messages,
    createdAt: toDate(c.createdAt),
    updatedAt: toDate(c.updatedAt),
  };
}

export interface ClientDailyBriefing {
  id: string;
  date: string;
  content: string;
  readiness: number | null;
  generatedAt: Date;
}

export async function fetchDailyBriefing(date: string): Promise<ClientDailyBriefing | null> {
  const data = await fetchJson<{
    briefing: Serialized<ClientDailyBriefing> | null;
  }>(`/api/coach/briefing?date=${encodeURIComponent(date)}`);
  if (!data.briefing) return null;
  const b = data.briefing;
  return {
    id: b.id,
    date: b.date,
    content: b.content,
    readiness: b.readiness ?? null,
    generatedAt: toDate(b.generatedAt),
  };
}

export interface ClientWeeklyReview {
  id: string;
  weekStart: Date;
  content: string;
  generatedAt: Date;
}

export async function fetchWeeklyReview(date: string): Promise<ClientWeeklyReview | null> {
  const data = await fetchJson<{
    review: Serialized<ClientWeeklyReview> | null;
  }>(`/api/coach/weekly-review?date=${encodeURIComponent(date)}`);
  if (!data.review) return null;
  const r = data.review;
  return {
    id: r.id,
    weekStart: toDate(r.weekStart),
    content: r.content,
    generatedAt: toDate(r.generatedAt),
  };
}

export interface ThresholdApplyPreview {
  estimates: {
    ftpW: number | null;
    ftpSource: string | null;
    runThresholdPaceSecPerKm: number | null;
  };
  current: {
    ftpW: number | null;
    runThresholdPaceSecPerKm: number | null;
  };
  changes: {
    field: 'ftpW' | 'runThresholdPaceSecPerKm';
    label: string;
    from: string;
    to: string;
  }[];
  hasChanges: boolean;
}

export async function fetchThresholdPreview(): Promise<ThresholdApplyPreview> {
  return fetchJson<ThresholdApplyPreview>('/api/athlete-profile/apply-estimates');
}

export async function fetchThresholdHistory(): Promise<ClientThresholdSnapshot[]> {
  const data = await fetchJson<Serialized<ClientThresholdSnapshot>[]>(
    '/api/athlete-profile/threshold-history',
  );
  return data.map((s) => ({
    ...s,
    createdAt: toDate(s.createdAt),
  }));
}

export async function fetchTrainingPlan(): Promise<ClientTrainingPlan | null> {
  const plan = await fetchJson<Serialized<ClientTrainingPlan> | null>('/api/training-plans');
  if (!plan) return null;
  return {
    ...plan,
    raceDate: toDate(plan.raceDate),
    startDate: toDate(plan.startDate),
    createdAt: toDate(plan.createdAt),
    updatedAt: toDate(plan.updatedAt),
    weeks: (plan.weeks ?? []).map((w): ClientPlanWeek => ({
      ...w,
      weekStart: toDate(w.weekStart),
    })),
  };
}
