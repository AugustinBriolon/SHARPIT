import { describe, expect, it } from 'vitest';
import { physicalHealthRule } from './physical-health';
import { baseContext, baseProposal, physicalHealthData } from '../test-fixtures';

describe('physicalHealthRule', () => {
  it('rejects any proposal when trainingBlockedByCondition is true', () => {
    const context = baseContext({
      physicalHealth: physicalHealthData({ trainingBlockedByCondition: true }),
    });

    const findings = physicalHealthRule(context, baseProposal({ intensity: 'RECOVERY' }));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleCode).toBe('PHYSICAL_HEALTH_BLOCKED');
    expect(findings[0]?.severity).toBe('REJECTED');
  });

  it('rejects any proposal when aggregate capacity is UNABLE', () => {
    const context = baseContext({
      physicalHealth: physicalHealthData({ aggregateTrainingCapacity: 'UNABLE' }),
    });

    const findings = physicalHealthRule(context, baseProposal());

    expect(findings.some((f) => f.ruleCode === 'PHYSICAL_HEALTH_UNABLE')).toBe(true);
    expect(findings[0]?.saferAlternative?.intensity).toBe('RECOVERY');
  });

  it('rejects high-intensity proposals when capacity is LIMITED, but allows endurance', () => {
    const context = baseContext({
      physicalHealth: physicalHealthData({ aggregateTrainingCapacity: 'LIMITED' }),
    });

    const rejected = physicalHealthRule(context, baseProposal({ intensity: 'THRESHOLD' }));
    const allowed = physicalHealthRule(context, baseProposal({ intensity: 'ENDURANCE' }));

    expect(rejected.some((f) => f.ruleCode === 'PHYSICAL_HEALTH_LIMITED')).toBe(true);
    expect(allowed).toEqual([]);
  });

  it('requires confirmation (not rejection) for high intensity when capacity is REDUCED', () => {
    const context = baseContext({
      physicalHealth: physicalHealthData({ aggregateTrainingCapacity: 'REDUCED' }),
    });

    const findings = physicalHealthRule(context, baseProposal({ intensity: 'VO2MAX' }));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('REQUIRES_CONFIRMATION');
  });

  it('is silent when no physical-health data exists', () => {
    const context = baseContext({ physicalHealth: null });
    expect(physicalHealthRule(context, baseProposal({ intensity: 'RACE' }))).toEqual([]);
  });

  it('is silent when capacity is FULL', () => {
    const context = baseContext({
      physicalHealth: physicalHealthData({ aggregateTrainingCapacity: 'FULL' }),
    });
    expect(physicalHealthRule(context, baseProposal({ intensity: 'RACE' }))).toEqual([]);
  });
});
