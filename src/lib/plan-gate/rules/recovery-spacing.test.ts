import { describe, expect, it } from 'vitest';
import { recoverySpacingRule } from './recovery-spacing';
import { baseContext, baseProposal } from '../test-fixtures';

describe('recoverySpacingRule', () => {
  it('warns when a high-intensity proposal is within 24h of another key session', () => {
    const context = baseContext({
      existingSessions: [
        {
          id: 'hard-1',
          date: new Date('2026-07-17T08:00:00Z'),
          type: 'BIKE',
          intensity: 'THRESHOLD',
          completed: false,
          load: 80,
        },
      ],
    });
    const findings = recoverySpacingRule(
      context,
      baseProposal({ date: '2026-07-17', intensity: 'VO2MAX' }),
    );
    expect(findings[0]?.ruleCode).toBe('INSUFFICIENT_RECOVERY_SPACING');
    expect(findings[0]?.severity).toBe('WARNING');
  });

  it('is silent for low-intensity proposals', () => {
    const context = baseContext({
      existingSessions: [
        {
          id: 'hard-1',
          date: new Date('2026-07-17T08:00:00Z'),
          type: 'BIKE',
          intensity: 'THRESHOLD',
          completed: false,
          load: 80,
        },
      ],
    });
    expect(
      recoverySpacingRule(context, baseProposal({ date: '2026-07-17', intensity: 'ENDURANCE' })),
    ).toEqual([]);
  });

  it('is silent when spacing is sufficient (>24h apart)', () => {
    const context = baseContext({
      existingSessions: [
        {
          id: 'hard-1',
          date: new Date('2026-07-10T08:00:00Z'),
          type: 'BIKE',
          intensity: 'THRESHOLD',
          completed: false,
          load: 80,
        },
      ],
    });
    expect(
      recoverySpacingRule(context, baseProposal({ date: '2026-07-17', intensity: 'VO2MAX' })),
    ).toEqual([]);
  });
});
