import type { WeeklyStats } from '@/lib/coach/weekly-review';
import { fetchJson, type Serialized, toDate } from './shared';

export interface ClientWeeklyReview {
  id: string;
  weekStart: Date;
  content: string;
  stats: WeeklyStats | null;
  generatedAt: Date;
}

export async function fetchWeeklyReview(date: string): Promise<ClientWeeklyReview | null> {
  const data = await fetchJson<{
    review: Serialized<ClientWeeklyReview> | null;
  }>(`/api/coach/weekly-review?date=${encodeURIComponent(date)}`);
  if (!data.review) {
    return null;
  }
  const r = data.review;
  return {
    id: r.id,
    weekStart: toDate(r.weekStart),
    content: r.content,
    stats: r.stats ?? null,
    generatedAt: toDate(r.generatedAt),
  };
}

/** Rétro la plus récente, quelle que soit la semaine (voir getLatestWeeklyReview). */
export async function fetchLatestWeeklyReview(): Promise<ClientWeeklyReview | null> {
  const data = await fetchJson<{
    review: Serialized<ClientWeeklyReview> | null;
  }>('/api/coach/weekly-review?latest=1');
  if (!data.review) {
    return null;
  }
  const r = data.review;
  return {
    id: r.id,
    weekStart: toDate(r.weekStart),
    content: r.content,
    stats: r.stats ?? null,
    generatedAt: toDate(r.generatedAt),
  };
}
