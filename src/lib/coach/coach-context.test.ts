import { describe, expect, it } from 'vitest';
import {
  formatConstraintsSection,
  formatDecisionSection,
  type CoachContext,
} from './coach-context';

function baseConstraint(
  overrides: Partial<CoachContext['constraints'][number]> = {},
): CoachContext['constraints'][number] {
  return {
    label: 'Tendinite genou',
    startDate: '2026-08-01',
    endDate: '2026-08-10',
    isActiveNow: true,
    note: null,
    trainingConstraint: 'REDUCED',
    allowedDisciplines: [],
    ...overrides,
  };
}

function baseDecision(overrides: Partial<CoachContext['decision']> = {}): CoachContext['decision'] {
  return {
    verdict: 'TRAIN_EASY',
    headline: 'Journée de récupération active',
    topAction: 'Footing léger 30 min',
    rationale: 'Charge élevée hier, récupération encore en cours',
    limitingFactorDomain: 'RECOVERY',
    limitingFactorDescription: 'Récupération autonome incomplète',
    confidence: 0.75,
    confidenceTier: 'MEDIUM',
    attentionDomain: 'RECOVERY',
    physiologicalConsistency: 'ALIGNED',
    consistencyScore: 90,
    criticalEvidence: undefined,
    primaryConflict: null,
    primaryOpportunity: null,
    adviceActionable: true,
    prescriptiveAdviceAllowed: true,
    ...overrides,
  } as CoachContext['decision'];
}

describe('formatDecisionSection', () => {
  it('returns nothing when there is no decision or it is INSUFFICIENT_DATA', () => {
    expect(formatDecisionSection(null)).toEqual([]);
    expect(formatDecisionSection(baseDecision({ verdict: 'INSUFFICIENT_DATA' }))).toEqual([]);
  });

  it('exposes the verdict and prescribes an action when prescriptiveAdviceAllowed is true', () => {
    const lines = formatDecisionSection(baseDecision());
    const text = lines.join('\n');
    expect(text).toContain('Verdict :');
    expect(text).toContain('Action prioritaire :');
    expect(text).not.toContain('Hors fenêtre de conseil actionnable');
  });

  it('withholds the verdict and refuses to prescribe when prescriptiveAdviceAllowed is false (F11)', () => {
    const lines = formatDecisionSection(baseDecision({ prescriptiveAdviceAllowed: false }));
    const text = lines.join('\n');
    expect(text).not.toContain('Verdict :');
    expect(text).not.toContain('Action prioritaire :');
    expect(text).not.toContain('Journée de récupération active');
    expect(text).not.toContain('Footing léger 30 min');
    expect(text).toContain('NE PRESCRIS AUCUNE action');
  });

  it('still surfaces factual observations (limiting factor) even when prescriptiveAdviceAllowed is false', () => {
    const lines = formatDecisionSection(baseDecision({ prescriptiveAdviceAllowed: false }));
    const text = lines.join('\n');
    expect(text).toContain('Facteur limitant');
    expect(text).toContain('Récupération autonome incomplète');
  });
});

describe('formatConstraintsSection', () => {
  it('returns nothing when there are no active/upcoming constraints', () => {
    expect(formatConstraintsSection([])).toEqual([]);
  });

  it('has no location parenthetical on the entry line — unlike the travel block', () => {
    const lines = formatConstraintsSection([baseConstraint()]);
    const text = lines.join('\n');
    expect(text).toContain('Contraintes temporaires');
    expect(text).toContain('Tendinite genou');
    expect(text).toContain('REDUCED');
    const entryLine = lines[lines.length - 1]!;
    // Travel entries render "label (locationLabel) : ..." — constraints have no place.
    expect(entryLine).not.toContain('Tendinite genou (');
  });

  it('marks the current period as en cours and a future one as à venir', () => {
    const active = formatConstraintsSection([baseConstraint({ isActiveNow: true })]).join('\n');
    const upcoming = formatConstraintsSection([baseConstraint({ isActiveNow: false })]).join('\n');
    expect(active).toContain('[en cours]');
    expect(upcoming).toContain('[à venir]');
  });

  it('lists allowed disciplines when present', () => {
    const text = formatConstraintsSection([
      baseConstraint({ allowedDisciplines: ['MOBILITY'] }),
    ]).join('\n');
    expect(text).toContain('sports :');
  });
});
