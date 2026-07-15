import { describe, expect, it } from 'vitest';
import { completedConflictRule } from './completed-conflict';
import { baseContext, baseProposal } from '../test-fixtures';

describe('completedConflictRule', () => {
  it('rejects MODIFY of an already-completed session', () => {
    const context = baseContext({
      existingSessions: [
        {
          id: 'done-1',
          date: new Date('2026-07-17T09:00:00Z'),
          type: 'RUN',
          intensity: 'ENDURANCE',
          completed: true,
          load: 40,
        },
      ],
    });
    const findings = completedConflictRule(
      context,
      baseProposal({ action: 'MODIFY', sessionId: 'done-1' }),
    );
    expect(findings[0]?.ruleCode).toBe('COMPLETED_SESSION_IMMUTABLE');
    expect(findings[0]?.severity).toBe('REJECTED');
  });

  it('rejects ADD that lands on the same day/type as a completed session', () => {
    const context = baseContext({
      existingSessions: [
        {
          id: 'done-1',
          date: new Date('2026-07-17T09:00:00Z'),
          type: 'RUN',
          intensity: 'ENDURANCE',
          completed: true,
          load: 40,
        },
      ],
    });
    const findings = completedConflictRule(
      context,
      baseProposal({ action: 'ADD', date: '2026-07-17', type: 'RUN' }),
    );
    expect(findings[0]?.ruleCode).toBe('COMPLETED_SESSION_CONFLICT');
  });

  it('allows MODIFY of a not-yet-completed session', () => {
    const context = baseContext({
      existingSessions: [
        {
          id: 'planned-1',
          date: new Date('2026-07-17T09:00:00Z'),
          type: 'RUN',
          intensity: 'ENDURANCE',
          completed: false,
          load: 40,
        },
      ],
    });
    const findings = completedConflictRule(
      context,
      baseProposal({ action: 'MODIFY', sessionId: 'planned-1' }),
    );
    expect(findings).toEqual([]);
  });
});
