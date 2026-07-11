/**
 * Decision Engine — evidence ranking and redundancy suppression.
 */

import type { ReasoningFinding } from '@/core/digital-twin/types';
import type { EnvironmentalDecisionSnapshot } from '@/core/inference/environment/types';
import { appendEnvironmentalFindings } from '@/core/inference/reasoning/scoring';
import type { EnvironmentalImpact } from '@/core/environment';
import type {
  DecisionDomain,
  DecisionEvidence,
  SuppressedDecisionEvidence,
} from './decision-state';
import { domainPriorityIndex, severityRank } from './priority';

const MAX_SUPPORTING_EVIDENCE = 5;
const MAX_EXPLANATION_ITEMS = 3;

function findingCategoryToDomain(category: ReasoningFinding['category']): DecisionDomain {
  switch (category) {
    case 'RECOVERY':
      return 'RECOVERY';
    case 'FATIGUE':
      return 'FATIGUE';
    case 'ADAPTATION':
      return 'ADAPTATION';
    case 'CROSS_SYSTEM':
      return 'ENVIRONMENT';
    default:
      return 'RECOVERY';
  }
}

function findingToEvidence(finding: ReasoningFinding, rank: number): DecisionEvidence {
  return {
    id: finding.id,
    domain: findingCategoryToDomain(finding.category),
    severity: finding.severity,
    title: finding.title,
    evidenceItems: finding.evidenceItems,
    confidence: finding.confidence,
    rank,
  };
}

function isRedundantWith(existing: DecisionEvidence, candidate: DecisionEvidence): boolean {
  if (existing.domain !== candidate.domain) return false;
  return severityRank(candidate.severity) >= severityRank(existing.severity);
}

export function rankAndSuppressEvidence(input: {
  findings: readonly ReasoningFinding[];
  environmentalImpact: EnvironmentalImpact | null;
  environmentSnapshot: EnvironmentalDecisionSnapshot | null;
}): {
  supportingEvidence: DecisionEvidence[];
  suppressedEvidence: SuppressedDecisionEvidence[];
  explanationOrder: string[];
} {
  const merged = appendEnvironmentalFindings([...input.findings], input.environmentalImpact);

  const sorted = [...merged].sort((a, b) => {
    const severityDiff = severityRank(a.severity) - severityRank(b.severity);
    if (severityDiff !== 0) return severityDiff;
    const domainDiff =
      domainPriorityIndex(findingCategoryToDomain(a.category)) -
      domainPriorityIndex(findingCategoryToDomain(b.category));
    if (domainDiff !== 0) return domainDiff;
    return b.confidence - a.confidence;
  });

  const supporting: DecisionEvidence[] = [];
  const suppressed: SuppressedDecisionEvidence[] = [];

  for (const finding of sorted) {
    const evidence = findingToEvidence(finding, supporting.length + suppressed.length + 1);
    const redundant = supporting.some((existing) => isRedundantWith(existing, evidence));

    if (redundant) {
      suppressed.push({
        ...evidence,
        suppressionReason: 'REDUNDANT_DOMAIN_SEVERITY',
      });
      continue;
    }

    if (supporting.length >= MAX_SUPPORTING_EVIDENCE) {
      suppressed.push({
        ...evidence,
        suppressionReason: 'RANK_BELOW_CUTOFF',
      });
      continue;
    }

    supporting.push(evidence);
  }

  if (
    input.environmentSnapshot?.trainingImpact === 'SIGNIFICANT' &&
    !supporting.some((e) => e.id === 'FINDING_ENVIRONMENTAL_LOAD')
  ) {
    const envEvidence: DecisionEvidence = {
      id: 'FINDING_ENVIRONMENT_CONTEXT',
      domain: 'ENVIRONMENT',
      severity: 'INFO',
      title: { code: 'decision.evidence.environment.context.title' },
      evidenceItems: [{ code: 'decision.evidence.environment.context.detail' }],
      confidence: input.environmentSnapshot.confidence,
      rank: supporting.length + 1,
    };
    if (supporting.length < MAX_SUPPORTING_EVIDENCE) {
      supporting.push(envEvidence);
    }
  }

  const explanationOrder = supporting.slice(0, MAX_EXPLANATION_ITEMS).map((e) => e.id);

  return {
    supportingEvidence: supporting,
    suppressedEvidence: suppressed,
    explanationOrder,
  };
}
