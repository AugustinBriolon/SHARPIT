import { ActivityType } from '@prisma/client';
import { activityNarrativeSchema, type ActivityNarrative } from '@/lib/validators/coach';

export const NARRATIVE_POLL_MS = 3_000;
export const NARRATIVE_POLL_MAX_MS = 120_000;
export const NARRATIVE_TIMEOUT_PREFIX = 'sharpit.narrative-poll-timeout.';

export const NARRATIVE_TYPES = new Set<ActivityType>([
  ActivityType.RUN,
  ActivityType.BIKE,
  ActivityType.SWIM,
]);

export function parseNarrative(raw: unknown): ActivityNarrative | null {
  const parsed = activityNarrativeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function readNarrativeTimedOut(activityId: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return sessionStorage.getItem(`${NARRATIVE_TIMEOUT_PREFIX}${activityId}`) === '1';
  } catch {
    return false;
  }
}

export function writeNarrativeTimedOut(activityId: string): void {
  try {
    sessionStorage.setItem(`${NARRATIVE_TIMEOUT_PREFIX}${activityId}`, '1');
  } catch {
    // ignore
  }
}

export function clearNarrativeTimedOut(activityId: string): void {
  try {
    sessionStorage.removeItem(`${NARRATIVE_TIMEOUT_PREFIX}${activityId}`);
  } catch {
    // ignore
  }
}

async function fetchActivityNarrative(activityId: string): Promise<{
  narrativeAnalysis?: unknown;
  narrativeAnalyzedAt?: string | null;
} | null> {
  const response = await fetch(`/api/activities/${activityId}`);
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as {
    narrativeAnalysis?: unknown;
    narrativeAnalyzedAt?: string | null;
  };
}

export async function pollActivityNarrative({
  activityId,
  onComplete,
  onTimeout,
}: {
  activityId: string;
  onComplete: (result: { analysis: unknown; analyzedAt: string }) => void;
  onTimeout: () => void;
}): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < NARRATIVE_POLL_MAX_MS) {
    await new Promise((resolve) => setTimeout(resolve, NARRATIVE_POLL_MS));

    try {
      const activity = await fetchActivityNarrative(activityId);
      if (activity?.narrativeAnalyzedAt) {
        onComplete({
          analysis: activity.narrativeAnalysis ?? null,
          analyzedAt: activity.narrativeAnalyzedAt,
        });
        clearNarrativeTimedOut(activityId);
        return;
      }
    } catch {
      // best-effort polling
    }
  }

  writeNarrativeTimedOut(activityId);
  onTimeout();
}

export async function generateActivityNarrative(activityId: string): Promise<{
  ok: boolean;
  narrativeAnalysis?: unknown;
  narrativeAnalyzedAt?: string | null;
  error?: string;
}> {
  const res = await fetch(`/api/activities/${activityId}/narrative`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force: true, wait: true }),
  });
  const data = (await res.json().catch(() => null)) as {
    narrativeAnalysis?: unknown;
    narrativeAnalyzedAt?: string | null;
    error?: string;
  } | null;
  if (!res.ok) {
    return { ok: false, error: data?.error ?? 'Synthèse impossible' };
  }
  return {
    ok: true,
    narrativeAnalysis: data?.narrativeAnalysis,
    narrativeAnalyzedAt: data?.narrativeAnalyzedAt,
  };
}
