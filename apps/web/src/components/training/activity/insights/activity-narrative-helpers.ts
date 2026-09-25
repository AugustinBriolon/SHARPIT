import { ActivityType } from '@prisma/client';
import { activityNarrativeSchema, type ActivityNarrative } from '@/lib/validators/coach';
import { sanitizeCoachCopy } from '@/lib/coach/sanitize-coach-copy';
import { fetchActivityNarrativeFields, postActivityNarrative } from '@/lib/query/fetchers';

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
  if (!parsed.success) {
    return null;
  }
  return {
    headline: sanitizeCoachCopy(parsed.data.headline),
    narrative: sanitizeCoachCopy(parsed.data.narrative),
  };
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
  return fetchActivityNarrativeFields(activityId);
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
  // Background: the server records the run and the app-shell watcher announces
  // it, so leaving the page no longer abandons the analysis (ADR-036).
  return postActivityNarrative(activityId, { force: true, wait: false });
}
