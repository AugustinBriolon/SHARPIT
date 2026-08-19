import { describe, expect, it } from 'vitest';
import { strengthCompletenessRule } from './strength-completeness';
import { baseContext, baseProposal } from '../test-fixtures';

const context = baseContext();

function strengthProposal(exerciseCount: number, durationMin = 45) {
  return baseProposal({
    type: 'STRENGTH',
    durationMin,
    strengthPrescription: {
      sets: Array.from({ length: exerciseCount }, (_, index) => ({
        exercise: `Exercice ${index + 1}`,
        sets: 3,
        reps: 12,
      })),
    },
  });
}

describe('strengthCompletenessRule', () => {
  it('warns on the prehab session that filled half its slot', () => {
    const findings = strengthCompletenessRule(context, strengthProposal(4));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleCode).toBe('STRENGTH_SESSION_UNDERFILLED');
    expect(findings[0]?.severity).toBe('WARNING');
    expect(findings[0]?.rationale).toContain('sous-remplie');
  });

  it('accepts a prescription that fills the planned duration', () => {
    expect(strengthCompletenessRule(context, strengthProposal(10))).toEqual([]);
  });

  it('warns when the prescription overflows the slot', () => {
    const findings = strengthCompletenessRule(context, strengthProposal(14, 30));
    expect(findings[0]?.ruleCode).toBe('STRENGTH_SESSION_OVERFILLED');
  });

  it('warns when a strength session carries no exercises at all', () => {
    const findings = strengthCompletenessRule(
      context,
      baseProposal({ type: 'STRENGTH', strengthPrescription: null }),
    );
    expect(findings[0]?.ruleCode).toBe('STRENGTH_PRESCRIPTION_MISSING');
  });

  it('ignores endurance sessions', () => {
    expect(strengthCompletenessRule(context, baseProposal({ type: 'RUN' }))).toEqual([]);
  });

  it('never blocks a plan — warnings only', () => {
    const findings = [
      ...strengthCompletenessRule(context, strengthProposal(3)),
      ...strengthCompletenessRule(context, baseProposal({ type: 'STRENGTH' })),
    ];
    expect(findings.every((f) => f.severity === 'WARNING')).toBe(true);
  });
});
