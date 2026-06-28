import type { ActivityStreamPayload } from "@/lib/streams";
import type {
  ClientActivity,
  ClientGoal,
  ClientHealthEntry,
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
  return data.map((s) => ({
    ...s,
    date: toDate(s.date),
    createdAt: toDate(s.createdAt),
    updatedAt: toDate(s.updatedAt),
  })) as unknown as ClientPlannedSession[];
}

export async function fetchActivityStream(
  id: string,
): Promise<ActivityStreamPayload> {
  return fetchJson<ActivityStreamPayload>(`/api/activities/${id}/streams`);
}
