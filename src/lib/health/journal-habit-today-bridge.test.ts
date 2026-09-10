import { describe, expect, it } from 'vitest';
import type { JournalHabitFinding } from '@/lib/health/journal-habit-analysis';
import { JOURNAL_ANALYSIS_MIN_DAYS } from '@/lib/health/journal-limits';
import {
  buildTodayJournalHabitBridge,
  formatTodayJournalHabitBridgeCopy,
  JOURNAL_ANALYSES_HREF,
  todayJournalHabitBridgeFromReading,
} from '@/lib/health/journal-habit-today-bridge';
import { buildJournalHabitReading } from '@/lib/health/journal-habit-reading';

function finding(
  overrides: Partial<JournalHabitFinding> &
    Pick<JournalHabitFinding, 'factorId' | 'polarity' | 'confidence'>,
): JournalHabitFinding {
  return {
    kind: 'effect',
    outcome: 'sleepMinutes',
    nYes: 5,
    nNo: 5,
    medianYes: 360,
    medianNo: 450,
    absDelta: 90,
    lagDays: 0,
    ...overrides,
  };
}

describe('todayJournalHabitBridge', () => {
  it('stays silent before analysis unlock', () => {
    const reading = buildJournalHabitReading(
      [
        finding({
          factorId: 'late_meal',
          polarity: 'minus',
          confidence: 'high',
        }),
      ],
      JOURNAL_ANALYSIS_MIN_DAYS - 1,
    );
    expect(todayJournalHabitBridgeFromReading(reading)).toBeNull();
  });

  it('stays silent when ready but no priority', () => {
    const reading = buildJournalHabitReading([], JOURNAL_ANALYSIS_MIN_DAYS + 2);
    expect(todayJournalHabitBridgeFromReading(reading)).toBeNull();
  });

  it('exposes provenance + complete sentence a new athlete can parse', () => {
    const findings = [
      finding({
        factorId: 'late_meal',
        polarity: 'minus',
        confidence: 'high',
      }),
      finding({
        factorId: 'late_meal',
        polarity: 'minus',
        confidence: 'high',
        outcome: 'recoveryScore',
        medianYes: 50,
        medianNo: 70,
        absDelta: 20,
      }),
    ];
    const bridge = buildTodayJournalHabitBridge(findings, 14);
    expect(bridge).not.toBeNull();
    expect(bridge?.href).toBe(JOURNAL_ANALYSES_HREF);
    expect(bridge?.sourceLabel).toBe('Depuis ton journal');
    expect(bridge?.habitLabel).toBe('Repas tardif');
    expect(bridge?.meaning).toBe(
      'Quand tu notes « Repas tardif », sommeil et récupération sont souvent plus bas.',
    );
    expect(bridge?.disclaimer).toMatch(/pas une preuve/i);
    expect(bridge?.ctaLabel).toBe('Voir l’analyse');
    expect(bridge?.confidenceNote).toBe('Association nette');
  });

  it('keeps sleep before recovery and completes the habit in the sentence', () => {
    const copy = formatTodayJournalHabitBridgeCopy({
      kind: 'compiled',
      factorId: 'device_in_bed',
      polarity: 'minus',
      confidence: 'medium',
      effects: [
        finding({
          factorId: 'device_in_bed',
          polarity: 'minus',
          confidence: 'medium',
          outcome: 'recoveryScore',
          medianYes: 50,
          medianNo: 70,
          absDelta: 20,
        }),
        finding({
          factorId: 'device_in_bed',
          polarity: 'minus',
          confidence: 'medium',
        }),
      ],
    });
    expect(copy.sourceLabel).toBe('Depuis ton journal');
    expect(copy.habitLabel).toBe('Écran au lit');
    expect(copy.meaning).toBe(
      'Quand tu notes « Écran au lit », sommeil et récupération sont souvent plus bas.',
    );
    expect(copy.confidenceNote).toBe('À confirmer');
  });
});
