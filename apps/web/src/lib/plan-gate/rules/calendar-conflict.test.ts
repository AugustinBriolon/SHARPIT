import { describe, expect, it } from 'vitest';
import { calendarConflictRule } from './calendar-conflict';
import { baseContext, baseProposal } from '../test-fixtures';

describe('calendarConflictRule', () => {
  it('is silent when no calendar is connected (busyBlocks is null)', () => {
    const context = baseContext({ busyBlocks: null });
    const findings = calendarConflictRule(
      context,
      baseProposal({ date: '2026-07-17', startTime: '09:00', durationMin: 60 }),
    );
    expect(findings).toEqual([]);
  });

  it('warns when the proposal overlaps a busy block', () => {
    const context = baseContext({
      busyBlocks: [{ dayKey: '2026-07-17', start: '09:30', end: '10:30' }],
    });
    const findings = calendarConflictRule(
      context,
      baseProposal({ date: '2026-07-17', startTime: '09:00', durationMin: 60 }),
    );
    expect(findings[0]?.ruleCode).toBe('CALENDAR_CONFLICT');
    expect(findings[0]?.severity).toBe('WARNING');
  });

  it('is silent when connected but no overlap exists', () => {
    const context = baseContext({
      busyBlocks: [{ dayKey: '2026-07-17', start: '18:00', end: '19:00' }],
    });
    const findings = calendarConflictRule(
      context,
      baseProposal({ date: '2026-07-17', startTime: '09:00', durationMin: 60 }),
    );
    expect(findings).toEqual([]);
  });

  it('is silent when the proposal has no startTime', () => {
    const context = baseContext({
      busyBlocks: [{ dayKey: '2026-07-17', start: '09:30', end: '10:30' }],
    });
    const findings = calendarConflictRule(
      context,
      baseProposal({ date: '2026-07-17', startTime: null }),
    );
    expect(findings).toEqual([]);
  });
});
