import { describe, expect, it } from 'vitest';
import { countDaysInSpan } from '@/lib/health/journal-habit-analysis-load';
import type { JournalAnalysisDay } from '@/lib/health/journal-habit-analysis';

function day(trainingDayId: string): JournalAnalysisDay {
  return { trainingDayId, factors: {}, sleepMinutes: null, recoveryScore: null, bodyBattery: null };
}

describe('countDaysInSpan', () => {
  it('counts calendar days between the first and last signalled day', () => {
    expect(countDaysInSpan([day('2026-08-01'), day('2026-08-03'), day('2026-08-10')])).toBe(10);
  });

  it('is zero with no signal and one for a single day', () => {
    expect(countDaysInSpan([])).toBe(0);
    expect(countDaysInSpan([day('2026-08-01')])).toBe(1);
  });
});
