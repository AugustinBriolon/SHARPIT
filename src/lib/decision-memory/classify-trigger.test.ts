import { describe, expect, it } from 'vitest';
import { classifyAdaptTrigger } from './classify-trigger';
import { baseProposal } from '@/lib/plan-gate/test-fixtures';
import type { GateSessionResult, RuleFinding } from '@/lib/plan-gate/types';

function finding(ruleCode: string, severity: RuleFinding['severity'] = 'WARNING'): RuleFinding {
  return { ruleCode, severity, rationale: 'x', evidenceRefs: [] };
}

function worstStatus(findings: RuleFinding[]): GateSessionResult['status'] {
  if (findings.some((f) => f.severity === 'REJECTED')) return 'REJECTED';
  if (findings.some((f) => f.severity === 'REQUIRES_CONFIRMATION')) return 'REQUIRES_CONFIRMATION';
  if (findings.length > 0) return 'WARNING';
  return 'ACCEPTED';
}

function gateResult(findings: RuleFinding[]): GateSessionResult {
  const worst = worstStatus(findings);
  return {
    proposal: baseProposal(),
    status: worst,
    findings,
    requiredAssumptions: [],
    saferAlternative: null,
  };
}

describe('classifyAdaptTrigger', () => {
  it('returns ATHLETE_ACTION when there is no gate result', () => {
    expect(classifyAdaptTrigger(null)).toBe('ATHLETE_ACTION');
  });

  it('returns ATHLETE_ACTION when the gate result has no findings', () => {
    expect(classifyAdaptTrigger(gateResult([]))).toBe('ATHLETE_ACTION');
  });

  it('classifies fatigue/load/recovery rule codes as PHYSIOLOGICAL_STATE', () => {
    expect(classifyAdaptTrigger(gateResult([finding('WEEKLY_LOAD_EXCEEDED')]))).toBe(
      'PHYSIOLOGICAL_STATE',
    );
    expect(classifyAdaptTrigger(gateResult([finding('DECISION_INTENSITY_CONFLICT')]))).toBe(
      'PHYSIOLOGICAL_STATE',
    );
    expect(classifyAdaptTrigger(gateResult([finding('INSUFFICIENT_RECOVERY_SPACING')]))).toBe(
      'PHYSIOLOGICAL_STATE',
    );
  });

  it('classifies safety/integrity rule codes as SAFETY_POLICY', () => {
    expect(classifyAdaptTrigger(gateResult([finding('PHYSICAL_HEALTH_BLOCKED', 'REJECTED')]))).toBe(
      'SAFETY_POLICY',
    );
    expect(
      classifyAdaptTrigger(gateResult([finding('COMPLETED_SESSION_CONFLICT', 'REJECTED')])),
    ).toBe('SAFETY_POLICY');
  });

  it('classifies calendar-conflict as CALENDAR and goal/data rules as GOAL', () => {
    expect(classifyAdaptTrigger(gateResult([finding('CALENDAR_CONFLICT')]))).toBe('CALENDAR');
    expect(classifyAdaptTrigger(gateResult([finding('BEYOND_GOAL_HORIZON')]))).toBe('GOAL');
    expect(classifyAdaptTrigger(gateResult([finding('MISSING_THRESHOLDS')]))).toBe('GOAL');
  });

  it('picks the category of the most severe finding when multiple fired', () => {
    const result = gateResult([
      finding('CALENDAR_CONFLICT', 'WARNING'),
      finding('PHYSICAL_HEALTH_BLOCKED', 'REJECTED'),
    ]);
    expect(classifyAdaptTrigger(result)).toBe('SAFETY_POLICY');
  });
});
