import { after } from 'next/server';
import { propagateAttributes } from '@langfuse/tracing';
import { flushLangfuseTraces, isLangfuseConfigured } from '@sharpit/server/lib/ai/langfuse';

export type CoachTraceAttrs = {
  /** Stable Langfuse trace name, e.g. coach-chat / coach-plan. */
  traceName: string;
  athleteId: string;
  /** Extra tags beyond the default `coach` tag. */
  tags?: string[];
  metadata?: Record<string, string>;
};

/**
 * Schedule a Langfuse flush after the response finishes — required on Vercel
 * so spans are not dropped when the isolate freezes.
 */
export function scheduleLangfuseFlush(): void {
  if (!isLangfuseConfigured()) {
    return;
  }
  after(() => {
    void flushLangfuseTraces();
  });
}

/**
 * Attach athlete + feature tags to all nested AI SDK generations for this request.
 * No-ops the attribute wrap when Langfuse is not configured (still runs `fn`).
 */
export async function withCoachTrace<T>(attrs: CoachTraceAttrs, fn: () => Promise<T>): Promise<T> {
  scheduleLangfuseFlush();
  if (!isLangfuseConfigured()) {
    return fn();
  }
  return propagateAttributes(
    {
      traceName: attrs.traceName,
      userId: attrs.athleteId,
      tags: ['coach', ...(attrs.tags ?? [])],
      metadata: {
        feature: 'coach',
        ...attrs.metadata,
      },
    },
    fn,
  );
}
