import { describe, expect, it } from 'vitest';
import type { TodayJournalHabitCallout } from '@/lib/journal/journal-habit-today-bridge';
import {
  buildHabitCoachingSignal,
  buildHabitRearrangeProposal,
  habitLeverChipLabel,
  isHabitPlanFocus,
  mergeRearrangeProposals,
} from '@/lib/today/rich/habit-coaching-signal';

const associationCallout: TodayJournalHabitCallout = {
  kind: 'association',
  bridge: {
    sourceLabel: 'Depuis ton journal',
    habitLabel: 'Repas tardif',
    meaning: 'Quand tu notes « Repas tardif », sommeil et récupération sont souvent plus bas.',
    disclaimer: 'Contraste dans tes saisies — pas une preuve de cause.',
    confidenceNote: 'Association nette',
    ctaLabel: 'Voir l’analyse',
    polarity: 'minus',
    confidence: 'high',
    factorId: 'late_meal',
    href: '/journal/analyses',
  },
};

const experimentCallout: TodayJournalHabitCallout = {
  kind: 'experiment',
  experiment: {
    sourceLabel: 'Test',
    meaning: 'Sans « Écran au lit »',
    habitLabel: 'Écran au lit',
    progressLabel: 'J3 / 7',
    heldLabel: '3 jours tenus',
    segments: ['held', 'held', 'held', 'pending', 'pending', 'pending', 'pending'],
    segmentsLabel: '3 jours tenus sur 7',
    ctaLabel: 'Voir le test',
    factorId: 'device_in_bed',
    href: '/journal/analyses',
  },
};

const demandingUpcoming = [
  {
    id: 's1',
    date: new Date(2026, 8, 12, 8),
    intensity: 'THRESHOLD' as const,
    completed: false,
  },
  {
    id: 's2',
    date: new Date(2026, 8, 14, 8),
    intensity: 'VO2MAX' as const,
    completed: false,
  },
];

describe('buildHabitCoachingSignal', () => {
  it('carries the callout for rearrange gating', () => {
    const signal = buildHabitCoachingSignal(associationCallout);
    expect(signal.callout).toBe(associationCallout);
  });
});

describe('buildHabitRearrangeProposal', () => {
  const day = new Date(2026, 8, 11);

  it('stays silent without demanding upcoming sessions', () => {
    expect(
      buildHabitRearrangeProposal({
        phase: 'MORNING',
        day,
        upcoming: [
          {
            id: 'easy',
            date: new Date(2026, 8, 12),
            intensity: 'ENDURANCE',
            completed: false,
          },
        ],
        callout: associationCallout,
      }),
    ).toBeNull();
  });

  it('stays silent for medium-confidence association', () => {
    expect(
      buildHabitRearrangeProposal({
        phase: 'MORNING',
        day,
        upcoming: demandingUpcoming,
        callout: {
          kind: 'association',
          bridge: { ...associationCallout.bridge, confidence: 'medium' },
        },
      }),
    ).toBeNull();
  });

  it('stays silent for plus polarity (lift)', () => {
    expect(
      buildHabitRearrangeProposal({
        phase: 'MORNING',
        day,
        upcoming: demandingUpcoming,
        callout: {
          kind: 'association',
          bridge: { ...associationCallout.bridge, polarity: 'plus' },
        },
      }),
    ).toBeNull();
  });

  it('proposes rearrange for high-confidence drag + demanding plan', () => {
    const proposal = buildHabitRearrangeProposal({
      phase: 'MORNING',
      day,
      upcoming: demandingUpcoming,
      callout: associationCallout,
      goalLabel: 'Semi Paris',
    });
    expect(proposal).toMatchObject({
      visible: true,
      trigger: 'HABIT_ASSOCIATION',
      kind: 'habit',
      ctaLabel: 'Proposer un rearrange',
      habitLever: { label: 'Repas tardif', source: 'association' },
    });
    expect(proposal?.why).toMatch(/vers Semi Paris/);
    expect(proposal?.focus).toMatch(/vers Semi Paris/);
    expect(proposal?.href).toContain('adapt=1');
    expect(proposal?.href).toContain('focus=');
  });

  it('proposes rearrange while a habit test is running', () => {
    const proposal = buildHabitRearrangeProposal({
      phase: 'SESSION_COMPLETED',
      day,
      upcoming: demandingUpcoming,
      callout: experimentCallout,
      goalLabel: '70.3',
    });
    expect(proposal).toMatchObject({
      visible: true,
      trigger: 'HABIT_EXPERIMENT',
      habitLever: { label: 'Écran au lit', source: 'experiment' },
    });
    expect(proposal?.why).toMatch(/J3 \/ 7/);
    expect(proposal?.why).not.toMatch(/Sans « Écran au lit »/);
    expect(proposal?.focus).toMatch(/vers 70\.3/);
  });

  it('ignores morning window sessions that are still today', () => {
    expect(
      buildHabitRearrangeProposal({
        phase: 'MORNING',
        day,
        upcoming: [
          {
            id: 'today-hard',
            date: new Date(2026, 8, 11, 18),
            intensity: 'THRESHOLD',
            completed: false,
          },
        ],
        callout: associationCallout,
      }),
    ).toBeNull();
  });
});

describe('mergeRearrangeProposals', () => {
  it('prefers twin proposal over habit and annotates the lever', () => {
    const twin = {
      visible: true as const,
      headline: 'Twin',
      why: 'mismatch',
      ctaLabel: 'Proposer un rearrange',
      href: '/plan/semaine?adapt=1',
      focus: 'twin',
      trigger: 'POST_SESSION' as const,
    };
    const habit = buildHabitRearrangeProposal({
      phase: 'MORNING',
      day: new Date(2026, 8, 11),
      upcoming: demandingUpcoming,
      callout: associationCallout,
    });
    const merged = mergeRearrangeProposals(twin, habit);
    expect(merged).toMatchObject({
      ...twin,
      habitLever: { label: 'Repas tardif', source: 'association' },
    });
  });

  it('falls back to habit when twin is silent', () => {
    const habit = buildHabitRearrangeProposal({
      phase: 'MORNING',
      day: new Date(2026, 8, 11),
      upcoming: demandingUpcoming,
      callout: associationCallout,
    });
    expect(mergeRearrangeProposals(null, habit)).toBe(habit);
  });

  it('clears habitLever when twin wins alone', () => {
    const twin = {
      visible: true as const,
      headline: 'Twin',
      why: 'mismatch',
      ctaLabel: 'Proposer un rearrange',
      href: '/plan/semaine?adapt=1',
      focus: 'twin',
      trigger: 'MORNING_MISMATCH' as const,
    };
    expect(mergeRearrangeProposals(twin, null)).toMatchObject({ habitLever: null });
  });
});

describe('isHabitPlanFocus', () => {
  it('detects journal and test focus strings', () => {
    expect(isHabitPlanFocus('Journal : « Repas tardif » associé…')).toBe(true);
    expect(isHabitPlanFocus("Test d'habitude en cours sur « Écran au lit ».")).toBe(true);
    expect(isHabitPlanFocus('Test d’habitude en cours sur « Écran au lit ».')).toBe(true);
    expect(isHabitPlanFocus('Twin en mode prudence.')).toBe(false);
    expect(isHabitPlanFocus(null)).toBe(false);
  });
});

describe('habitLeverChipLabel', () => {
  it('prefixes Journal or Test', () => {
    expect(habitLeverChipLabel({ label: 'Repas tardif', source: 'association' })).toBe(
      'Journal · Repas tardif',
    );
    expect(habitLeverChipLabel({ label: 'Écran au lit', source: 'experiment' })).toBe(
      'Test · Écran au lit',
    );
  });
});
