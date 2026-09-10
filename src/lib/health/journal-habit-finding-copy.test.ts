import { describe, expect, it } from 'vitest';
import {
  formatCompiledJournalHabitFinding,
  formatJournalHabitFinding,
} from '@/lib/health/journal-habit-finding-copy';

describe('journal-habit-finding-copy', () => {
  it('formats an association (not causation) with median and confidence', () => {
    const copy = formatJournalHabitFinding({
      kind: 'effect',
      factorId: 'device_in_bed',
      outcome: 'sleepMinutes',
      nYes: 5,
      nNo: 5,
      medianYes: 360,
      medianNo: 470,
      absDelta: 110,
      polarity: 'minus',
      confidence: 'high',
      lagDays: 0,
    });
    expect(copy.title).toContain('Écran au lit');
    expect(copy.title).toContain('sommeil');
    expect(copy.detail).toContain('Médiane');
    expect(copy.detail).toContain('6 h 00');
    expect(copy.confidenceLabel).toBe('Association nette');
  });

  it('mentions lag when outcome is shifted', () => {
    const copy = formatJournalHabitFinding({
      kind: 'effect',
      factorId: 'alcohol',
      outcome: 'sleepMinutes',
      nYes: 5,
      nNo: 5,
      medianYes: 340,
      medianNo: 460,
      absDelta: 120,
      polarity: 'minus',
      confidence: 'high',
      lagDays: 1,
    });
    expect(copy.detail).toContain('lendemain');
  });

  it('joins sleep and recovery into one title', () => {
    const copy = formatCompiledJournalHabitFinding({
      kind: 'compiled',
      factorId: 'device_in_bed',
      polarity: 'minus',
      confidence: 'high',
      effects: [
        {
          kind: 'effect',
          factorId: 'device_in_bed',
          outcome: 'sleepMinutes',
          nYes: 5,
          nNo: 5,
          medianYes: 360,
          medianNo: 470,
          absDelta: 110,
          polarity: 'minus',
          confidence: 'high',
          lagDays: 0,
        },
        {
          kind: 'effect',
          factorId: 'device_in_bed',
          outcome: 'recoveryScore',
          nYes: 5,
          nNo: 5,
          medianYes: 40,
          medianNo: 70,
          absDelta: 30,
          polarity: 'minus',
          confidence: 'high',
          lagDays: 0,
        },
      ],
    });
    expect(copy.title).toBe('Écran au lit · sommeil et récupération plus bas');
    expect(copy.detail).toContain('sommeil');
    expect(copy.detail).toContain('récupération');
  });
});
