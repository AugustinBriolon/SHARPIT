import { describe, expect, it } from 'vitest';
import { goalPhaseCoherenceRule } from './goal-phase-coherence';
import { baseContext, baseProposal } from '../test-fixtures';

describe('goalPhaseCoherenceRule', () => {
  it('warns when the proposal is beyond the goal target date', () => {
    const context = baseContext({
      goal: { horizon: 'SHORT_TERM', targetDate: new Date('2026-07-16T00:00:00Z') },
    });
    const findings = goalPhaseCoherenceRule(context, baseProposal({ date: '2026-07-20' }));
    expect(findings.some((f) => f.ruleCode === 'BEYOND_GOAL_HORIZON')).toBe(true);
  });

  it('is silent when the proposal is before the goal target date', () => {
    const context = baseContext({
      goal: { horizon: 'SHORT_TERM', targetDate: new Date('2026-08-01T00:00:00Z') },
    });
    expect(goalPhaseCoherenceRule(context, baseProposal({ date: '2026-07-20' }))).toEqual([]);
  });

  it('warns when a TAPER week receives a load increase above recent average', () => {
    const context = baseContext({
      planWeeks: [{ weekStart: new Date('2026-07-13T00:00:00Z'), phase: 'TAPER', targetLoad: 100 }],
      existingSessions: [
        {
          id: 's1',
          date: new Date('2026-07-14T00:00:00Z'),
          type: 'RUN',
          intensity: 'ENDURANCE',
          completed: true,
          load: 30,
        },
      ],
    });
    const findings = goalPhaseCoherenceRule(
      context,
      baseProposal({ date: '2026-07-17', load: 90 }),
    );
    expect(findings.some((f) => f.ruleCode === 'TAPER_LOAD_INCREASE')).toBe(true);
  });

  it('is silent outside TAPER phase', () => {
    const context = baseContext({
      planWeeks: [{ weekStart: new Date('2026-07-13T00:00:00Z'), phase: 'BUILD', targetLoad: 100 }],
    });
    expect(goalPhaseCoherenceRule(context, baseProposal({ date: '2026-07-17', load: 90 }))).toEqual(
      [],
    );
  });
});
