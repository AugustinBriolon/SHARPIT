import { describe, expect, it } from 'vitest';
import { buildJournalAnalysesViewModel } from '@/lib/journal/journal-analyses-view-model';
import type { JournalHabitFinding } from '@/lib/journal/journal-habit-analysis';
import { buildJournalHabitReading } from '@/lib/journal/journal-habit-reading';
import { journalTrackableById } from '@/lib/journal/journal-trackables';

function finding(overrides: Partial<JournalHabitFinding>): JournalHabitFinding {
  return {
    kind: 'effect',
    factorId: 'alcohol',
    outcome: 'sleepMinutes',
    nYes: 7,
    nNo: 22,
    medianYes: 372,
    medianNo: 424,
    yesValues: [350, 372, 380, 360, 430, 365, 390],
    noValues: [424, 410, 440, 430, 400],
    absDelta: 52,
    polarity: 'minus',
    confidence: 'high',
    lagDays: 1,
    ...overrides,
  };
}

const FINDINGS: JournalHabitFinding[] = [
  finding({}),
  finding({
    outcome: 'recoveryScore',
    medianYes: 41,
    medianNo: 58,
    absDelta: 17,
    yesValues: [41],
    noValues: [58],
  }),
  finding({
    factorId: 'device_in_bed',
    outcome: 'sleepMinutes',
    medianYes: 400,
    medianNo: 430,
    absDelta: 30,
    confidence: 'high',
    lagDays: 0,
  }),
  // Favourable habit: higher sleep with the habit.
  finding({
    factorId: 'yoga',
    outcome: 'sleepMinutes',
    medianYes: 460,
    medianNo: 420,
    absDelta: 40,
    polarity: 'plus',
    confidence: 'high',
    lagDays: 0,
    yesValues: [450, 460, 470, 455, 465, 458, 462],
    noValues: [410, 420, 415, 425, 418],
  }),
  // Net habit, but its Body Battery effect alone is weak → that domain stays hidden.
  finding({
    factorId: 'device_in_bed',
    outcome: 'bodyBattery',
    confidence: 'medium',
    medianYes: 45,
    medianNo: 52,
    absDelta: 7,
    lagDays: 0,
  }),
  finding({
    factorId: 'late_meal',
    confidence: 'medium',
    medianYes: 410,
    medianNo: 440,
    absDelta: 30,
    lagDays: 0,
  }),
];

function viewModel(findings = FINDINGS, daysWithSignal = 48, daysInSpan = 56) {
  return buildJournalAnalysesViewModel({
    findings,
    reading: buildJournalHabitReading(findings, daysWithSignal),
    daysInSpan,
  });
}

function allNetRows(vm: ReturnType<typeof viewModel>) {
  return [...vm.dragDomains, ...vm.liftDomains].flatMap((d) => d.rows);
}

describe('buildJournalAnalysesViewModel', () => {
  it('counts compiled habits, so one habit across two domains counts once', () => {
    const vm = viewModel();

    expect(vm.netCount).toBe(3);
    expect(vm.weakCount).toBe(1);
    const alcoholRows = allNetRows(vm).filter((r) => r.factorId === 'alcohol');
    expect(alcoholRows).toHaveLength(2);
  });

  it('splits net associations into drag and lift bands', () => {
    const vm = viewModel();

    expect(vm.dragDomains.map((d) => d.title)).toEqual(['Sommeil', 'Récupération']);
    expect(vm.liftDomains.map((d) => d.title)).toEqual(['Sommeil']);
    expect(allNetRows(vm).every((r) => r.polarity === 'minus' || r.polarity === 'plus')).toBe(true);
    expect(vm.dragDomains.flatMap((d) => d.rows).every((r) => r.polarity === 'minus')).toBe(true);
    expect(vm.liftDomains.flatMap((d) => d.rows).every((r) => r.polarity === 'plus')).toBe(true);
  });

  it('draws each row on its domain axis with a signed gap and a spoken equivalent', () => {
    const row = viewModel().dragDomains[0]!.rows[0]!;

    expect(row.label).toBe(journalTrackableById('alcohol')?.label);
    expect(row.deltaLabel).toBe('−52′');
    expect(row.lagLabel).toBe('mesure +1 j');
    expect(row.withoutLabel).toBe('7 h 04');
    expect(row.withLabel).toBe('6 h 12');
    expect(row.ariaLabel).toBe(
      'Alcool, sommeil, mesuré le lendemain : 6 h 12 avec contre 7 h 04 sans, 7 jours contre 22',
    );
    expect(row.withHabit.pct).toBeLessThan(row.without.pct);
    expect(row.withDays).toHaveLength(7);
  });

  it('keeps weak habits for the footer and lists them once', () => {
    const vm = viewModel();

    expect(vm.weakLabels).toEqual([journalTrackableById('late_meal')?.label]);
    expect(vm.weakDomains.flatMap((d) => d.rows).every((r) => r.weak)).toBe(true);
  });

  it('reports coverage gaps as missing days', () => {
    expect(viewModel().coverage).toEqual({ daysWithSignal: 48, daysInSpan: 56, missingDays: 8 });
  });

  it('badges habits that already have a test reading', () => {
    const vm = buildJournalAnalysesViewModel({
      findings: FINDINGS,
      reading: buildJournalHabitReading(FINDINGS, 48),
      daysInSpan: 56,
      testedFactorIds: ['alcohol'],
    });
    const rows = allNetRows(vm);

    expect(rows.filter((r) => r.tested).map((r) => r.factorId)).toEqual(['alcohol', 'alcohol']);
    expect(rows.find((r) => r.factorId === 'device_in_bed')?.tested).toBe(false);
  });
});
