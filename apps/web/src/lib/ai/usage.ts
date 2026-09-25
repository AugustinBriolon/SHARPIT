import { prisma } from '@/lib/prisma';

export type AiUsageFeature = 'coach' | 'analysis';

export type AiUsageTokens = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

/**
 * Fire-and-forget cost visibility — not a spend cap (that's the rate limiters
 * in src/lib/rate-limit.ts). Logging must never break a real coach response,
 * so failures are swallowed here rather than propagated.
 */
export async function recordAiUsage(
  athleteId: string,
  feature: AiUsageFeature,
  usage: AiUsageTokens | undefined,
): Promise<void> {
  try {
    await prisma.aiUsageEvent.create({
      data: {
        athleteId,
        feature,
        inputTokens: usage?.inputTokens ?? null,
        outputTokens: usage?.outputTokens ?? null,
        totalTokens: usage?.totalTokens ?? null,
      },
    });
  } catch (error) {
    console.error('[ai-usage] failed to record usage:', error);
  }
}
