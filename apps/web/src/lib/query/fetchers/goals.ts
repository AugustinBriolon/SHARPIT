import type { ClientGoal } from '../types';
import { fetchJson, type Serialized, toDate, toDateOrNull } from './shared';

export async function fetchGoals(): Promise<ClientGoal[]> {
  const data = await fetchJson<Serialized<ClientGoal>[]>('/api/goals');
  return data.map((g) => ({
    ...g,
    targetDate: toDateOrNull(g.targetDate),
    lastAchievedAt: toDateOrNull(g.lastAchievedAt),
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
