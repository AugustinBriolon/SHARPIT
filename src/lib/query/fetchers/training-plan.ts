import type { ClientPlanWeek, ClientTrainingPlan } from '../types';
import { fetchJson, type Serialized, toDate } from './shared';

export async function fetchTrainingPlan(): Promise<ClientTrainingPlan | null> {
  const plan = await fetchJson<Serialized<ClientTrainingPlan> | null>('/api/training-plans');
  if (!plan) {
    return null;
  }
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
