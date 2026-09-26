import { describe, expect, it } from 'vitest';
import {
  daysFromHeadline,
  goalClause,
  planVivantProgress,
  planVivantReading,
  weekClause,
} from './plan-vivant-reading';

function segment(id: string, count: number, label: string) {
  return { id, dateLabel: String(count), intensityLabel: label };
}

describe('daysFromHeadline', () => {
  it('reads the countdown the goal view formats', () => {
    expect(daysFromHeadline('J-27 · Sub 6h')).toBe(27);
    expect(daysFromHeadline('J-1')).toBe(1);
  });

  it('returns null when there is no countdown to read', () => {
    expect(daysFromHeadline('62 % de la cible')).toBeNull();
    expect(daysFromHeadline('Cap sur l’objectif')).toBeNull();
  });
});

describe('goalClause', () => {
  it('says the deadline in words, not in J-minus', () => {
    expect(
      goalClause({
        goalLabel: 'Half IronMan Versailles',
        headline: 'J-27 · Sub 6h',
        progress: null,
      }),
    ).toBe('Half IronMan Versailles dans 27 jours');
  });

  it('keeps the singular, and names the day itself', () => {
    expect(goalClause({ goalLabel: 'Semi', headline: 'J-1', progress: null })).toBe(
      'Semi dans 1 jour',
    );
    expect(goalClause({ goalLabel: 'Semi', headline: 'J-0', progress: null })).toBe(
      'Semi aujourd’hui',
    );
  });

  it('reads a metric goal as its percentage', () => {
    expect(goalClause({ goalLabel: '5 km sous 20′', headline: 'peu importe', progress: 62 })).toBe(
      '5 km sous 20′ — 62 % de la cible',
    );
  });

  it('falls back to the goal when nothing is countable', () => {
    expect(goalClause({ goalLabel: 'Rester en forme', headline: '—', progress: null })).toBe(
      'Rester en forme',
    );
  });
});

describe('weekClause', () => {
  it('counts a week that has not started', () => {
    expect(weekClause([segment('remaining', 3, 'restantes')])).toBe('3 séances cette semaine');
  });

  it('counts progress through the week', () => {
    expect(weekClause([segment('done', 1, 'faite'), segment('remaining', 2, 'restantes')])).toBe(
      '1 faite sur 3 cette semaine',
    );
  });

  it('says so when the week is finished', () => {
    expect(weekClause([segment('done', 4, 'faites')])).toBe('semaine bouclée, 4 séances');
  });

  it('returns null when there is nothing to count', () => {
    expect(weekClause([])).toBeNull();
  });
});

describe('planVivantProgress', () => {
  const phases = [
    { label: 'Base', current: false },
    { label: 'Développement', current: false },
    { label: 'Spécifique', current: true },
    { label: 'Affûtage', current: false },
  ];

  it('counts the periodisation blocks up to the one in progress', () => {
    expect(planVivantProgress({ progress: null, phases })).toEqual({
      total: 4,
      filled: 3,
      percent: null,
      label: 'Spécifique',
    });
  });

  it('becomes a single fill when the goal carries a percentage', () => {
    expect(planVivantProgress({ progress: 62, phases })).toEqual({
      total: 1,
      filled: 1,
      percent: 62,
      label: '62 %',
    });
  });

  it('clamps a percentage that overshoots', () => {
    expect(planVivantProgress({ progress: 140, phases: [] })?.percent).toBe(100);
  });

  it('draws nothing without a plan or a percentage', () => {
    expect(planVivantProgress({ progress: null, phases: [] })).toBeNull();
    expect(
      planVivantProgress({ progress: null, phases: [{ label: 'Base', current: false }] }),
    ).toBeNull();
  });
});

describe('planVivantReading', () => {
  it('joins where you are heading and where the week stands', () => {
    expect(
      planVivantReading({
        goalLabel: 'Half IronMan Versailles',
        headline: 'J-27 · Sub 6h',
        progress: null,
        segments: [segment('done', 1, 'faite'), segment('remaining', 2, 'restantes')],
      }),
    ).toBe('Half IronMan Versailles dans 27 jours — 1 faite sur 3 cette semaine');
  });

  it('uses the caller’s wording for an empty week', () => {
    expect(
      planVivantReading({
        goalLabel: 'Half IronMan Versailles',
        headline: 'J-27 · Sub 6h',
        progress: null,
        segments: [],
        emptyWeekClause: 'aucune séance cette semaine',
      }),
    ).toBe('Half IronMan Versailles dans 27 jours — aucune séance cette semaine');
  });

  it('says the goal alone when the week is empty and unnamed', () => {
    expect(
      planVivantReading({
        goalLabel: 'Semi',
        headline: 'J-5',
        progress: null,
        segments: [],
      }),
    ).toBe('Semi dans 5 jours');
  });
});
