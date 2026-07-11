/**
 * Decision Engine — domain priority and attention routing.
 */

import type { OverallVerdict, SystemAttentionPriority } from '@/core/digital-twin/types';
import type { DecisionDomain, DecisionLimitingFactor, DecisionPriority } from './decision-state';

/** Safety-first domain ordering — lower index wins arbitration. */
export const DOMAIN_SAFETY_PRIORITY: readonly DecisionDomain[] = [
  'PHYSICAL_HEALTH',
  'FATIGUE',
  'RECOVERY',
  'ENVIRONMENT',
  'ADAPTATION',
  'DAILY_STRAIN',
  'PLANNING',
  'GOALS',
] as const;

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 0,
  WARNING: 1,
  INFO: 2,
};

export function domainPriorityIndex(domain: DecisionDomain): number {
  const index = DOMAIN_SAFETY_PRIORITY.indexOf(domain);
  return index === -1 ? DOMAIN_SAFETY_PRIORITY.length : index;
}

export function severityRank(severity: string): number {
  return SEVERITY_RANK[severity] ?? 2;
}

export function resolveAttentionDomain(
  limitingFactor: DecisionLimitingFactor,
  verdict: OverallVerdict,
): DecisionPriority['attentionDomain'] {
  if (limitingFactor.domain === 'PHYSICAL_HEALTH') return 'PHYSICAL_HEALTH';
  if (limitingFactor.domain === 'ENVIRONMENT') return 'ENVIRONMENT';
  if (limitingFactor.system === 'RECOVERY') return 'RECOVERY';
  if (limitingFactor.system === 'FATIGUE') return 'FATIGUE';
  if (limitingFactor.system === 'ADAPTATION') return 'ADAPTATION';
  if (verdict === 'TRAIN_HARD' || verdict === 'TRAIN_SMART') return 'BALANCED';
  return 'BALANCED';
}

export function toSystemAttentionPriority(
  attention: DecisionPriority['attentionDomain'],
): SystemAttentionPriority {
  switch (attention) {
    case 'RECOVERY':
      return 'RECOVERY';
    case 'FATIGUE':
      return 'FATIGUE';
    case 'ADAPTATION':
      return 'ADAPTATION';
    default:
      return 'BALANCED';
  }
}

export function resolveConfidenceTier(
  confidence: number,
): import('./decision-state').DecisionConfidenceTier {
  if (confidence >= 0.75) return 'HIGH';
  if (confidence >= 0.6) return 'MEDIUM';
  if (confidence > 0) return 'LOW';
  return 'INSUFFICIENT';
}

export function shouldGateAdvice(confidence: number, verdict: OverallVerdict): boolean {
  return confidence < 0.6 || verdict === 'INSUFFICIENT_DATA';
}
