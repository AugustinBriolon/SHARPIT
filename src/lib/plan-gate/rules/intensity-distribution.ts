import type { GateContext, GateProposal, PlanLevelGateRule, RuleFinding } from '../types';

const HIGH_INTENSITY = new Set(['THRESHOLD', 'VO2MAX', 'RACE']);
/** Matches the coach/plan SYSTEM_PROMPT's own stated target ("2-3 séances qualité max/semaine") — not a new number. */
const MAX_HIGH_INTENSITY_PER_ROLLING_WEEK = 3;

function isHighIntensityProposal(proposal: GateProposal): boolean {
  return (
    (proposal.action === 'ADD' || proposal.action === 'MODIFY') &&
    (proposal.intensity !== undefined && proposal.intensity !== null) &&
    HIGH_INTENSITY.has(proposal.intensity)
  );
}

function collectHighIntensityFromProposals(proposals: readonly GateProposal[]): Date[] {
  return proposals.filter(isHighIntensityProposal).map((p) => new Date(`${p.date}T00:00:00`));
}

function collectHighIntensityFromSessions(
  context: GateContext,
  modifiedIds: Set<string | null | undefined>,
): Date[] {
  return context.existingSessions
    .filter((s) => !modifiedIds.has(s.id))
    .filter((s) => (s.intensity !== undefined && s.intensity !== null) && HIGH_INTENSITY.has(s.intensity))
    .map((s) => s.date);
}

function collectHighIntensityEvents(
  context: GateContext,
  proposals: readonly GateProposal[],
  modifiedIds: Set<string | null | undefined>,
): Date[] {
  const events = [
    ...collectHighIntensityFromProposals(proposals),
    ...collectHighIntensityFromSessions(context, modifiedIds),
  ];
  events.sort((a, b) => a.getTime() - b.getTime());
  return events;
}

function maxEventsInRollingWeek(events: Date[]): number {
  let maxCount = 0;
  for (const anchor of events) {
    const windowEnd = anchor.getTime() + 7 * 86_400_000;
    const count = events.filter(
      (e) => e.getTime() >= anchor.getTime() && e.getTime() < windowEnd,
    ).length;
    if (count > maxCount) {
      maxCount = count;
    }
  }
  return maxCount;
}

/** Plan-level: too many high-intensity sessions in any rolling 7-day window. */
export const intensityDistributionRule: PlanLevelGateRule = (
  context: GateContext,
  proposals: readonly GateProposal[],
): RuleFinding[] => {
  const modifiedIds = new Set(
    proposals.filter((p) => p.action === 'MODIFY' && p.sessionId).map((p) => p.sessionId),
  );
  const events = collectHighIntensityEvents(context, proposals, modifiedIds);
  const maxCount = maxEventsInRollingWeek(events);

  if (maxCount > MAX_HIGH_INTENSITY_PER_ROLLING_WEEK) {
    return [
      {
        ruleCode: 'INTENSITY_DISTRIBUTION_EXCEEDED',
        severity: 'WARNING',
        rationale: `${maxCount} séances haute intensité (seuil/VO2max/course) tombent dans une même fenêtre de 7 jours — au-delà des 2-3 séances qualité par semaine recommandées.`,
        evidenceRefs: ['proposals[*].intensity', 'existingSessions[*].intensity'],
      },
    ];
  }

  return [];
};
