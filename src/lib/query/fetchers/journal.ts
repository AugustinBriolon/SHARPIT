import { fetchJson } from './shared';

export async function fetchJournalDaySignals(trainingDayId: string): Promise<unknown> {
  return fetchJson(`/api/journal/day-signals?day=${encodeURIComponent(trainingDayId)}`);
}

export async function fetchJournalHabitBridge(): Promise<unknown> {
  return fetchJson('/api/journal/habit-bridge');
}
