import type { RecordsPayload } from "@/lib/records";
import type { ActivityStreamPayload } from "@/lib/streams";
import type {
  ClientActivity,
  ClientGoal,
  ClientHealthEntry,
  ClientPhysicalNote,
  ClientPlannedSession,
  ClientPlanWeek,
  ClientThresholdSnapshot,
  ClientTrainingPlan,
} from "./types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Requête échouée (${res.status}) sur ${url}`);
  }
  return res.json() as Promise<T>;
}

type RawRecord = Record<string, unknown>;

function toDate(value: unknown): Date {
  return new Date(value as string);
}

function toDateOrNull(value: unknown): Date | null {
  return value == null ? null : new Date(value as string);
}

export async function fetchActivities(): Promise<ClientActivity[]> {
  const data = await fetchJson<RawRecord[]>("/api/activities");
  return data.map((a) => ({
    ...a,
    date: toDate(a.date),
    createdAt: toDate(a.createdAt),
    updatedAt: toDate(a.updatedAt),
  })) as unknown as ClientActivity[];
}

export async function fetchHealthEntries(
  days: number,
): Promise<ClientHealthEntry[]> {
  const data = await fetchJson<RawRecord[]>(`/api/health?days=${days}`);
  return data.map((h) => ({
    ...h,
    date: toDate(h.date),
    createdAt: toDate(h.createdAt),
    updatedAt: toDate(h.updatedAt),
  })) as unknown as ClientHealthEntry[];
}

export async function fetchGoals(): Promise<ClientGoal[]> {
  const data = await fetchJson<RawRecord[]>("/api/goals");
  return data.map((g) => ({
    ...g,
    targetDate: toDateOrNull(g.targetDate),
    createdAt: toDate(g.createdAt),
    updatedAt: toDate(g.updatedAt),
  })) as unknown as ClientGoal[];
}

export async function fetchPlannedSessions(): Promise<ClientPlannedSession[]> {
  const data = await fetchJson<RawRecord[]>("/api/planned-sessions");
  return data.map((s) => {
    const activity = s.activity as RawRecord | null;
    return {
      ...s,
      date: toDate(s.date),
      createdAt: toDate(s.createdAt),
      updatedAt: toDate(s.updatedAt),
      analyzedAt: toDateOrNull(s.analyzedAt),
      activity: activity
        ? {
            ...activity,
            date: toDate(activity.date),
            createdAt: toDate(activity.createdAt),
            updatedAt: toDate(activity.updatedAt),
          }
        : null,
    };
  }) as unknown as ClientPlannedSession[];
}

export async function fetchActivityStream(
  id: string,
): Promise<ActivityStreamPayload> {
  return fetchJson<ActivityStreamPayload>(`/api/activities/${id}/streams`);
}

export async function fetchRecords(): Promise<RecordsPayload> {
  return fetchJson<RecordsPayload>("/api/records");
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
  return fetchJson<GoogleCalendarInfo[]>("/api/google/calendars");
}

export async function fetchPhysicalNotes(): Promise<ClientPhysicalNote[]> {
  const data = await fetchJson<RawRecord[]>("/api/physical-notes");
  return data.map((n) => ({
    ...n,
    startDate: toDate(n.startDate),
    resolvedAt: toDateOrNull(n.resolvedAt),
    createdAt: toDate(n.createdAt),
    updatedAt: toDate(n.updatedAt),
    checkins: ((n.checkins as RawRecord[]) ?? []).map((c) => ({
      ...c,
      date: toDate(c.date),
      createdAt: toDate(c.createdAt),
    })),
  })) as unknown as ClientPhysicalNote[];
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
  const data = await fetchJson<RawRecord[]>("/api/coach/conversations");
  return data.map((c) => ({
    id: c.id as string,
    title: c.title as string,
    createdAt: toDate(c.createdAt),
    updatedAt: toDate(c.updatedAt),
  }));
}

export async function fetchConversation(
  id: string,
): Promise<ClientConversation> {
  const c = await fetchJson<RawRecord>(`/api/coach/conversations/${id}`);
  return {
    id: c.id as string,
    title: c.title as string,
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

export async function fetchDailyBriefing(
  date: string,
): Promise<ClientDailyBriefing | null> {
  const data = await fetchJson<{ briefing: RawRecord | null }>(
    `/api/coach/briefing?date=${encodeURIComponent(date)}`,
  );
  if (!data.briefing) return null;
  const b = data.briefing;
  return {
    id: b.id as string,
    date: b.date as string,
    content: b.content as string,
    readiness: (b.readiness as number | null) ?? null,
    generatedAt: toDate(b.generatedAt),
  };
}

export interface ClientWeeklyReview {
  id: string;
  weekStart: Date;
  content: string;
  generatedAt: Date;
}

export async function fetchWeeklyReview(
  date: string,
): Promise<ClientWeeklyReview | null> {
  const data = await fetchJson<{ review: RawRecord | null }>(
    `/api/coach/weekly-review?date=${encodeURIComponent(date)}`,
  );
  if (!data.review) return null;
  const r = data.review;
  return {
    id: r.id as string,
    weekStart: toDate(r.weekStart),
    content: r.content as string,
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
    field: "ftpW" | "runThresholdPaceSecPerKm";
    label: string;
    from: string;
    to: string;
  }[];
  hasChanges: boolean;
}

export async function fetchThresholdPreview(): Promise<ThresholdApplyPreview> {
  return fetchJson<ThresholdApplyPreview>("/api/athlete-profile/apply-estimates");
}

export async function fetchThresholdHistory(): Promise<ClientThresholdSnapshot[]> {
  const data = await fetchJson<RawRecord[]>(
    "/api/athlete-profile/threshold-history",
  );
  return data.map((s) => ({
    ...s,
    createdAt: toDate(s.createdAt),
  })) as unknown as ClientThresholdSnapshot[];
}

export async function fetchTrainingPlan(): Promise<ClientTrainingPlan | null> {
  const plan = await fetchJson<RawRecord | null>("/api/training-plans");
  if (!plan) return null;
  return {
    ...plan,
    raceDate: toDate(plan.raceDate),
    startDate: toDate(plan.startDate),
    createdAt: toDate(plan.createdAt),
    updatedAt: toDate(plan.updatedAt),
    weeks: ((plan.weeks as RawRecord[]) ?? []).map(
      (w): ClientPlanWeek =>
        ({
          ...w,
          weekStart: toDate(w.weekStart),
        }) as ClientPlanWeek,
    ),
  } as ClientTrainingPlan;
}
