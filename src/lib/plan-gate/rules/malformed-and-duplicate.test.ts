import { describe, expect, it } from 'vitest';
import { malformedAndDuplicateRule } from './malformed-and-duplicate';
import { baseContext, baseProposal, NOW } from '../test-fixtures';

describe('malformedAndDuplicateRule', () => {
  it('rejects an invalid date format', () => {
    const findings = malformedAndDuplicateRule(baseContext(), baseProposal({ date: '17-07-2026' }));
    expect(findings[0]?.ruleCode).toBe('MALFORMED_PROPOSAL');
    expect(findings[0]?.severity).toBe('REJECTED');
  });

  it('rejects a non-positive duration', () => {
    const findings = malformedAndDuplicateRule(baseContext(), baseProposal({ durationMin: 0 }));
    expect(findings[0]?.ruleCode).toBe('MALFORMED_PROPOSAL');
  });

  it('rejects a MODIFY proposal with no sessionId', () => {
    const findings = malformedAndDuplicateRule(
      baseContext(),
      baseProposal({ action: 'MODIFY', sessionId: null }),
    );
    expect(findings[0]?.ruleCode).toBe('MALFORMED_PROPOSAL');
  });

  it('rejects a session dated in the past', () => {
    const findings = malformedAndDuplicateRule(
      baseContext({ now: NOW }),
      baseProposal({ date: '2026-07-01' }),
    );
    expect(findings[0]?.ruleCode).toBe('PAST_DATE');
    expect(findings[0]?.severity).toBe('REJECTED');
  });

  it('rejects an ADD that duplicates an existing session of the same type on the same day', () => {
    const context = baseContext({
      existingSessions: [
        {
          id: 'existing-1',
          date: new Date('2026-07-17T09:00:00Z'),
          type: 'RUN',
          intensity: 'ENDURANCE',
          completed: false,
          load: 40,
        },
      ],
    });
    const findings = malformedAndDuplicateRule(
      context,
      baseProposal({ action: 'ADD', date: '2026-07-17', type: 'RUN' }),
    );
    expect(findings[0]?.ruleCode).toBe('DUPLICATE_SESSION');
  });

  it('accepts a well-formed, future, non-duplicate proposal', () => {
    expect(malformedAndDuplicateRule(baseContext(), baseProposal())).toEqual([]);
  });

  it('does not reject a MODIFY that inherits a past date from the existing session', () => {
    // A MODIFY that only changes load/intensity inherits the existing session's date
    // (see adapt route's toGateProposal) — that date may already be in the past.
    // Only ADD proposals should ever be rejected for PAST_DATE.
    const findings = malformedAndDuplicateRule(
      baseContext({ now: NOW }),
      baseProposal({ action: 'MODIFY', sessionId: 'existing-1', date: '2026-07-01' }),
    );
    expect(findings).toEqual([]);
  });

  it('does not flag a MODIFY of the same-day session as a duplicate', () => {
    const context = baseContext({
      existingSessions: [
        {
          id: 'existing-1',
          date: new Date('2026-07-17T09:00:00Z'),
          type: 'RUN',
          intensity: 'ENDURANCE',
          completed: false,
          load: 40,
        },
      ],
    });
    const findings = malformedAndDuplicateRule(
      context,
      baseProposal({ action: 'MODIFY', sessionId: 'existing-1', date: '2026-07-17', type: 'RUN' }),
    );
    expect(findings).toEqual([]);
  });
});
