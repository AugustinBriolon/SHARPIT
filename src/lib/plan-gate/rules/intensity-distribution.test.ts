import { describe, expect, it } from 'vitest';
import { intensityDistributionRule } from './intensity-distribution';
import { baseContext, baseProposal } from '../test-fixtures';

describe('intensityDistributionRule', () => {
  it('warns when more than 3 high-intensity sessions fall in a rolling 7-day window', () => {
    const context = baseContext({
      existingSessions: [
        {
          id: 'e1',
          date: new Date('2026-07-13T00:00:00Z'),
          type: 'RUN',
          intensity: 'THRESHOLD',
          completed: true,
          load: 60,
        },
        {
          id: 'e2',
          date: new Date('2026-07-15T00:00:00Z'),
          type: 'BIKE',
          intensity: 'VO2MAX',
          completed: false,
          load: 60,
        },
      ],
    });
    const proposals = [
      baseProposal({ date: '2026-07-16', intensity: 'THRESHOLD' }),
      baseProposal({ date: '2026-07-18', intensity: 'RACE' }),
    ];

    const findings = intensityDistributionRule(context, proposals);

    expect(findings.some((f) => f.ruleCode === 'INTENSITY_DISTRIBUTION_EXCEEDED')).toBe(true);
  });

  it('is silent when the week stays within the 2-3 quality-session guideline', () => {
    const context = baseContext();
    const proposals = [
      baseProposal({ date: '2026-07-16', intensity: 'THRESHOLD' }),
      baseProposal({ date: '2026-07-19', intensity: 'VO2MAX' }),
    ];

    expect(intensityDistributionRule(context, proposals)).toEqual([]);
  });

  it('ignores endurance/recovery sessions entirely', () => {
    const context = baseContext();
    const proposals = [
      baseProposal({ date: '2026-07-14', intensity: 'ENDURANCE' }),
      baseProposal({ date: '2026-07-15', intensity: 'RECOVERY' }),
      baseProposal({ date: '2026-07-16', intensity: 'ENDURANCE' }),
      baseProposal({ date: '2026-07-17', intensity: 'ENDURANCE' }),
    ];

    expect(intensityDistributionRule(context, proposals)).toEqual([]);
  });
});
