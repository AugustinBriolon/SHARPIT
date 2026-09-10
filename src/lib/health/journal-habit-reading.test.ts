import { describe, expect, it } from 'vitest';
import type { JournalHabitFinding } from '@/lib/health/journal-habit-analysis';
import { buildJournalHabitReading } from '@/lib/health/journal-habit-reading';

function finding(
  overrides: Partial<JournalHabitFinding> &
    Pick<JournalHabitFinding, 'factorId' | 'polarity' | 'confidence'>,
): JournalHabitFinding {
  return {
    kind: 'effect',
    yesValues: [],
    noValues: [],
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

describe('buildJournalHabitReading', () => {
  it('returns empty reading when no findings', () => {
    const reading = buildJournalHabitReading([], 14);
    expect(reading.empty).toBe(true);
    expect(reading.headline).toMatch(/rien|aucune/i);
    expect(reading.priority).toBeNull();
    expect(reading.highlights).toHaveLength(0);
  });

  it('prioritizes a high-confidence minus finding and counts compiled rows', () => {
    const findings = [
      finding({
        factorId: 'creatine',
        polarity: 'plus',
        confidence: 'high',
        outcome: 'recoveryScore',
        medianYes: 70,
        medianNo: 55,
        absDelta: 15,
      }),
      finding({
        factorId: 'device_in_bed',
        polarity: 'minus',
        confidence: 'high',
      }),
      finding({
        factorId: 'device_in_bed',
        polarity: 'minus',
        confidence: 'high',
        outcome: 'recoveryScore',
        medianYes: 40,
        medianNo: 70,
        absDelta: 30,
      }),
      finding({
        factorId: 'late_meal',
        polarity: 'minus',
        confidence: 'medium',
      }),
    ];
    const reading = buildJournalHabitReading(findings, 14);
    expect(reading.empty).toBe(false);
    expect(reading.netCount).toBe(2);
    expect(reading.weakCount).toBe(1);
    expect(reading.priority?.factorId).toBe('device_in_bed');
    expect(reading.priority?.title).toMatch(/sommeil et récupération/);
    expect(reading.headline).toContain('2');
    expect(reading.actionHint.toLowerCase()).toMatch(/sans|7 jours|teste/);
  });

  it('falls back to medium when no high confidence', () => {
    const reading = buildJournalHabitReading(
      [
        finding({
          factorId: 'alcohol',
          polarity: 'minus',
          confidence: 'medium',
          lagDays: 1,
        }),
      ],
      10,
    );
    expect(reading.netCount).toBe(0);
    expect(reading.weakCount).toBe(1);
    expect(reading.priority?.factorId).toBe('alcohol');
    expect(reading.headline.toLowerCase()).toMatch(/piste|fragile|confirmer/);
  });

  it('names the lever and its size in the verdict, with counts in the summary', () => {
    const reading = buildJournalHabitReading(
      [
        finding({ factorId: 'alcohol', polarity: 'minus', confidence: 'high' }),
        {
          ...finding({ factorId: 'alcohol', polarity: 'minus', confidence: 'high' }),
          outcome: 'recoveryScore',
          medianYes: 41,
          medianNo: 58,
          absDelta: 17,
        },
        finding({ factorId: 'late_meal', polarity: 'minus', confidence: 'medium' }),
      ],
      48,
    );

    expect(reading.verdict).toBe(
      'Ton levier le plus net : « Alcool », 1 h 30 de sommeil et 17 points de récupération en moins.',
    );
    expect(reading.summary).toBe('48 jours analysés · 1 association nette · 1 à confirmer');
  });
});
