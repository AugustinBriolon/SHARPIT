import { describe, expect, it } from 'vitest';
import { normalizeAthleteEquipment } from '@/lib/equipment/parse';
import {
  formatConstraintsSection,
  formatDecisionSection,
  formatCoachContext,
  type CoachContext,
} from './coach-context';

function baseConstraint(
  overrides: Partial<CoachContext['constraints'][number]> = {},
): CoachContext['constraints'][number] {
  return {
    label: 'Tendinite genou',
    locationLabel: null,
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

function minimalContext(overrides: Partial<CoachContext> = {}): CoachContext {
  return {
    today: 'lundi 10 août 2026',
    note: null,
    equipment: normalizeAthleteEquipment(null),
    practicedSports: ['run', 'bike', 'swim', 'triathlon'],
    profile: null,
    fitness: { ctl: 50, atl: 40, tsb: 10 },
    load: {
      dailyLoad: 40,
      weeklyLoad: 200,
      acwr: 1.0,
      fatigue: 'Medium',
      loadMonotony: null,
      loadStrain: null,
    },
    availableDays: ['Lundi'],
    health: {
      readinessToday: 70,
      readinessLevel: null,
      hrvStatus: null,
      bodyBattery: null,
      avgSleepMin: 420,
      avgHrv: null,
      avgRestingHr: null,
      avgReadiness: null,
    },
    primaryRace: null,
    races: [],
    metricGoals: [],
    recent: [],
    realizedSessions: [],
    upcomingPlanned: [
      {
        id: 'ps_abc',
        date: 'mar. 11 août',
        dateIso: '2026-08-11',
        type: 'Course',
        title: 'Tempo',
        intensity: 'TEMPO',
        durationMin: 50,
        startTime: '07:00',
        locationLabel: null,
      },
    ],
    travel: [],
    constraints: [],
    physical: [],
    fatigue: null,
    adaptation: null,
    decision: null,
    environment: {
      homeLabel: 'Sens',
      thermalLabel: 'Chaleur marquée',
      summaryLine: null,
      detailLine: null,
      trainingImpact: 'MODERATE',
      airTemperatureC: 28,
      relativeHumidityPct: 55,
      recoveryDemandAdjustment: 0.05,
      performanceAdjustment: -0.03,
    },
    scenarioComparison: null,
    ...overrides,
  } as CoachContext;
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

  it('renders active constraints', () => {
    const text = formatConstraintsSection([baseConstraint()]).join('\n');
    expect(text).toContain('Tendinite genou');
  });
});

describe('formatCoachContext relevance contract', () => {
  it('includes practiced sports allowlist for twin-informed proposals', () => {
    const text = formatCoachContext(minimalContext({ practicedSports: ['run'] }));
    expect(text).toContain('## Sports pratiqués');
    expect(text).toContain('IMPÉRATIF');
    expect(text).toContain('Course');
    expect(text).toContain('historique');
  });

  it('includes planned session ids for update without listPlannedSessions', () => {
    const text = formatCoachContext(minimalContext());
    expect(text).toContain('id=ps_abc');
    expect(text).toContain('2026-08-11');
  });

  it('includes home environment temperature for outdoor session adaptation', () => {
    const text = formatCoachContext(minimalContext());
    expect(text).toContain('Environnement du jour');
    expect(text).toContain('Sens');
    expect(text).toContain('28 °C');
    expect(text).toContain('Chaleur marquée');
  });

  it('does not require scenario comparison on every message', () => {
    const text = formatCoachContext(minimalContext({ scenarioComparison: null }));
    expect(text).not.toContain('Comparaison de scénarios');
  });

  it('includes scenario comparison when present (plan/adapt path)', () => {
    const text = formatCoachContext(
      minimalContext({
        scenarioComparison:
          '## Comparaison de scénarios (Scenario Engine — orchestration)\nRecommandation : KEEP',
      }),
    );
    expect(text).toContain('Comparaison de scénarios');
  });
});
