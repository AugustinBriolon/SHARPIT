import type { ActivityStreamPayload } from "@/lib/streams";
import type {
  ClientActivity,
  ClientGoal,
  ClientHealthEntry,
  ClientPhysicalNote,
  ClientPlannedSession,
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
