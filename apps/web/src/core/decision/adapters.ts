/**
 * Decision Engine — adapters for legacy ReasoningState and API serialization.
 */

import type { FindingCategory, ReasoningFinding, ReasoningState } from '@/core/digital-twin/types';
import type { DecisionDomain, DecisionState } from './decision-state';

function evidenceCategory(domain: DecisionDomain): FindingCategory {
  switch (domain) {
    case 'RECOVERY':
    case 'FATIGUE':
    case 'ADAPTATION':
      return domain;
    default:
      return 'CROSS_SYSTEM';
  }
}

export function decisionStateToReasoningState(decision: DecisionState): ReasoningState {
  const keyFindings: ReasoningFinding[] = decision.supportingEvidence.map((evidence) => ({
    id: evidence.id,
    category: evidenceCategory(evidence.domain),
    severity: evidence.severity,
    title: evidence.title,
    evidenceItems: evidence.evidenceItems,
    confidence: evidence.confidence,
  }));

  return {
    overallVerdict: decision.overallVerdict,
    systemAttentionPriority: decision.systemAttentionPriority,
    physiologicalConsistency: decision.physiologicalConsistency,
    consistencyScore: decision.consistencyScore,
    keyFindings,
    limitingFactor: {
      system:
        decision.limitingFactor.system === 'PHYSICAL_HEALTH'
          ? null
          : decision.limitingFactor.system,
      description: decision.limitingFactor.description,
      actionable: decision.limitingFactor.actionable,
    },
    opportunities: decision.opportunities,
    conflicts: decision.conflicts.map((c) => ({
      id: c.id,
      type: c.type,
      descriptionCode: c.descriptionCode,
      models: c.domains.map(String),
      resolutionCode: c.resolutionCode,
    })),
    topAction: decision.topAction,
    evidenceGraph: decision.evidenceGraph,
    confidence: decision.confidence,
    dataCompleteness: decision.dataCompleteness,
    modelId: 'reasoning-v1',
    computedAt: decision.computedAt,
    trainingDayId: decision.trainingDayId,
  };
}

export type SerializedDecisionState = Omit<DecisionState, 'computedAt'> & {
  computedAt: string;
};

export function serializeDecisionState(decision: DecisionState): SerializedDecisionState {
  return {
    ...decision,
    computedAt: decision.computedAt.toISOString(),
  };
}
