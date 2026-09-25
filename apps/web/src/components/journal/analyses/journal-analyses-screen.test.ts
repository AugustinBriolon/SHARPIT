import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { JournalAnalysesScreen } from './journal-analyses-screen';
import { buildJournalAnalysesViewModel } from '@/lib/journal/journal-analyses-view-model';
import type { JournalHabitFinding } from '@/lib/journal/journal-habit-analysis';
import { JOURNAL_HABIT_AXES, axisPosition } from '@/lib/journal/journal-habit-axis';
import { buildJournalHabitReading } from '@/lib/journal/journal-habit-reading';

import type { HabitExperimentView } from '@/lib/journal/journal-habit-experiment-view';

function finding(overrides: Partial<JournalHabitFinding>): JournalHabitFinding {
  return {
    kind: 'effect',
    factorId: 'alcohol',
    outcome: 'sleepMinutes',
    nYes: 7,
    nNo: 22,
    medianYes: 372,
    // Sits on the 7 h 30 tick, so point and tick must share one position.
    medianNo: 450,
    yesValues: [350, 372, 380, 360, 430, 365, 390],
    noValues: [424, 450, 460, 470, 440],
    absDelta: 78,
    polarity: 'minus',
    confidence: 'high',
    lagDays: 1,
    ...overrides,
  };
}

const FINDINGS = [
  finding({}),
  finding({ factorId: 'device_in_bed', medianYes: 410, medianNo: 452, absDelta: 42, lagDays: 0 }),
  finding({
    factorId: 'yoga',
    medianYes: 470,
    medianNo: 430,
    absDelta: 40,
    polarity: 'plus',
    lagDays: 0,
    yesValues: [460, 470, 480, 465, 475, 468, 472],
    noValues: [420, 430, 425, 435, 428],
  }),
  finding({
    factorId: 'late_meal',
    confidence: 'medium',
    medianYes: 420,
    medianNo: 452,
    absDelta: 32,
    lagDays: 0,
  }),
];

const RUNNING_TEST: HabitExperimentView = {
  id: 'exp-1',
  factorId: 'alcohol',
  title: 'Sans « Alcool »',
  status: 'running',
  progressLabel: 'J5 / 7',
  segments: ['held', 'held', 'held', 'missed', 'pending', 'pending', 'pending'],
  heldLabel: '3 jours tenus',
  reviewLabel: 'relecture le mer. 17 sept.',
  verdict: null,
  verdictLabel: null,
  deltaLine: null,
};

function render(experiments: HabitExperimentView[] = []): string {
  const reading = buildJournalHabitReading(FINDINGS, 48);
  const viewModel = buildJournalAnalysesViewModel({ findings: FINDINGS, reading, daysInSpan: 56 });
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(JournalAnalysesScreen, {
        analysis: { reading, viewModel },
        daysWithSignal: 48,
        experiments,
        isPro: false,
        minDays: 7,
      }),
    ),
  );
}

describe('JournalAnalysesScreen', () => {
  const html = render();

  it('shows the same counts in the plate and the footer', () => {
    expect(html).toContain('48 jours analysés · 3 associations nettes · 1 à confirmer');
    expect(html).toMatch(/>1<\/span> piste à confirmer/);
  });

  it('splits freins and aides into distinct bands', () => {
    expect(html).toContain('Ce qui freine');
    expect(html).toContain('Ce qui aide');
    expect(html).not.toContain('Limites de la lecture');
  });

  it('labels the avec/sans comparison in plain language', () => {
    expect(html).toContain('Sans l’habitude');
    expect(html).toContain('Avec l’habitude');
  });

  it('aligns a median on its axis tick at the same position', () => {
    const left = `left:${axisPosition(JOURNAL_HABIT_AXES.sleepMinutes, 450).pct}%`;
    const occurrences = html.split(left).length - 1;
    // Header tick + row tick guide + the hollow point of the alcohol row, at least.
    expect(occurrences).toBeGreaterThanOrEqual(3);
  });

  it('gives every dumbbell a spoken equivalent and a single lag form', () => {
    expect(html).toContain(
      'aria-label="Alcool, sommeil, mesuré le lendemain : 6 h 12 avec contre 7 h 30 sans, 7 jours contre 22"',
    );
    expect(html.split('mesure +1 j').length - 1).toBe(1);
  });

  it('keeps the expanded distribution collapsed until asked', () => {
    expect(html).toContain('aria-expanded="false"');
  });

  it('offers a 7-day test from the plate and each association', () => {
    expect(html.split('Tester 7 jours').length - 1).toBeGreaterThanOrEqual(2);
    expect(html).not.toContain('Mes tests');
    expect(html).not.toContain('Aucun test en cours');
    expect(html).not.toContain('Couverture');
  });

  it('places the live test after the reading plate and hides start CTAs', () => {
    const withTest = render([RUNNING_TEST]);
    const plateAt = withTest.indexOf('À retenir');
    const testAt = withTest.indexOf('Arrêter le test');

    expect(plateAt).toBeGreaterThanOrEqual(0);
    expect(testAt).toBeGreaterThan(plateAt);
    expect(withTest).toContain('J5 / 7');
    expect(withTest).toContain('3 jours tenus · relecture le mer. 17 sept.');
    expect(withTest).toContain('Sans « Alcool »');
    expect(withTest).toContain('En test');
    expect(withTest).not.toContain('Tester 7 jours');
    expect(withTest).not.toContain('Mes tests');
    expect(withTest).not.toContain('abandonné');
    expect(withTest).not.toContain('Couverture');
  });
});
