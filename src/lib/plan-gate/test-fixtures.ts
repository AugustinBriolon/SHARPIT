import type { GateContext, GateProposal } from './types';

export const NOW = new Date('2026-07-15T08:00:00.000Z');

export function baseContext(overrides: Partial<GateContext> = {}): GateContext {
  return {
    trainingDayId: '2026-07-15',
    decision: null,
    physicalHealth: null,
    fatigueTrainingCapacity: null,
    recentActivities: [],
    existingSessions: [],
    goal: null,
    planWeeks: [],
    busyBlocks: null,
    athleteProfile: { hasThresholds: true },
    now: NOW,
    ...overrides,
  };
}

export function baseProposal(overrides: Partial<GateProposal> = {}): GateProposal {
  return {
    sessionId: null,
    action: 'ADD',
    date: '2026-07-17',
    startTime: null,
    type: 'RUN',
    intensity: 'ENDURANCE',
    durationMin: 60,
    load: 50,
    title: 'Sortie endurance',
    rationale: null,
    ...overrides,
  };
}

export function decisionState(
  overrides: Partial<GateContext['decision']> = {},
): NonNullable<GateContext['decision']> {
  return {
    primaryDecision: {
      verdict: 'TRAIN_SMART',
      headlineCode: 'x',
      verbCode: 'x',
      focusCode: 'x',
      rationaleCode: 'x',
      expectedBenefit: 0.5,
    },
    limitingFactor: {
      domain: null,
      system: null,
      description: null,
      actionable: false,
      priority: 99,
    },
    supportingEvidence: [],
    suppressedEvidence: [],
    confidence: 0.8,
    confidenceTier: 'HIGH',
    dataCompleteness: 'FULL',
    conflicts: [],
    priority: { attentionDomain: 'BALANCED', safetyOverrideApplied: false, confidenceGated: false },
    explanationOrder: [],
    overallVerdict: 'TRAIN_SMART',
    systemAttentionPriority: 'BALANCED',
    physiologicalConsistency: 'ALIGNED',
    consistencyScore: 1,
    opportunities: [],
    topAction: null,
    evidenceGraph: { nodes: [], edges: [] },
    modelId: 'decision-v1',
    trainingDayId: '2026-07-15',
    ...overrides,
  } as NonNullable<GateContext['decision']>;
}

export function physicalHealthData(
  overrides: Partial<NonNullable<GateContext['physicalHealth']>> = {},
): NonNullable<GateContext['physicalHealth']> {
  return {
    conditions: [],
    activeConditionCount: 0,
    aggregateTrainingCapacity: 'FULL',
    primaryLimitingConditionId: null,
    trainingBlockedByCondition: false,
    confidence: 0.9,
    dataCompleteness: 'FULL',
    decision: { verdict: 'CLEAR', rationale: [] },
    recommendation: { trainingCapacity: 'FULL', confidence: 0.9, evidence: [] },
    signals: {
      activeConditionCount: 0,
      maxSeverity: 0,
      improvingCount: 0,
      worseningCount: 0,
      recurrentCount: 0,
    },
    computedAt: NOW.toISOString(),
    ...overrides,
  };
}
