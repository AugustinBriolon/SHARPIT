import { isLangfuseConfigured } from '@sharpit/server/lib/ai/langfuse';

/** Coach traces carry the athlete's context (health data included) and `userId = athleteId`. */
const PAGE_SIZE = 100;
/** Bounded so an account deletion never hangs on Langfuse; the purge cron can run again. */
const MAX_PAGES = 50;

type TracePage = { data?: Array<{ id: string }> };

function langfuseRequest(path: string, init?: RequestInit): Promise<Response> {
  const base = (process.env.LANGFUSE_BASE_URL?.trim() || 'https://cloud.langfuse.com').replace(
    /\/+$/,
    '',
  );
  const credentials = Buffer.from(
    `${process.env.LANGFUSE_PUBLIC_KEY?.trim()}:${process.env.LANGFUSE_SECRET_KEY?.trim()}`,
  ).toString('base64');
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}

async function nextTraceIds(athleteId: string): Promise<string[]> {
  const query = new URLSearchParams({ userId: athleteId, limit: String(PAGE_SIZE), page: '1' });
  const response = await langfuseRequest(`/api/public/traces?${query}`);
  if (!response.ok) {
    throw new Error(`Langfuse traces list failed (${response.status})`);
  }
  const page = (await response.json()) as TracePage;
  return (page.data ?? []).map((trace) => trace.id);
}

/**
 * Deletes every Langfuse trace of an athlete (Langfuse public API). Always reads page 1:
 * each round deletes what it read, so the next round sees the following traces.
 * Returns how many were deleted; a no-op when Langfuse is not configured.
 */
export async function deleteLangfuseTracesForAthlete(athleteId: string): Promise<number> {
  if (!isLangfuseConfigured()) {
    return 0;
  }
  let deleted = 0;
  for (let round = 0; round < MAX_PAGES; round += 1) {
    const traceIds = await nextTraceIds(athleteId);
    if (traceIds.length === 0) {
      break;
    }
    const response = await langfuseRequest('/api/public/traces', {
      method: 'DELETE',
      body: JSON.stringify({ traceIds }),
    });
    if (!response.ok) {
      throw new Error(`Langfuse traces delete failed (${response.status})`);
    }
    deleted += traceIds.length;
  }
  return deleted;
}
