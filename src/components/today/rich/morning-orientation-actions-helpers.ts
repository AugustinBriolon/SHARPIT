import type { TodayViewModel } from '@/core/presentation/today-view-model';

type MorningOrientation = NonNullable<TodayViewModel['morningOrientation']>;

export function resolveMorningOrientationProposal(orientation: MorningOrientation) {
  const proposal = orientation.confirmEase ?? orientation.confirmIncrease;
  if (!proposal) {
    return null;
  }

  const decisionId = orientation.holdDecisionId ?? proposal.decisionId ?? null;
  if (!decisionId) {
    return null;
  }

  const direction: 'DOWN' | 'UP' = orientation.confirmIncrease ? 'UP' : 'DOWN';
  const detailSessionId = proposal.sessionId || null;

  return { proposal, decisionId, direction, detailSessionId };
}
