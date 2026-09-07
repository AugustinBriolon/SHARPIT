import { describe, expect, it } from 'vitest';
import {
  buildTodayLimitingFacts,
  buildTodayWhyFacts,
  verdictFactValue,
} from './today-instrument-facts';

describe('today-instrument-facts', () => {
  it('verdictFactValue maps TRAIN_EASY to interpretive posture', () => {
    expect(verdictFactValue('TRAIN_EASY')).toEqual({
      value: 'Garde de la marge',
      hint: 'charge légère, pas de push',
    });
  });

  it('buildTodayWhyFacts never restates twin scores', () => {
    const facts = buildTodayWhyFacts({
      verdict: 'TRAIN_EASY',
      consistency: 'CONFLICTING',
      whyFocus: 'adaptation_recovery',
      decision: {
        supportingEvidence: [
          {
            id: 'd1',
            domain: 'RECOVERY',
            severity: 'WARNING',
            title: { code: 'reasoning.finding.dissonance.title' },
            evidenceItems: [{ code: 'reasoning.finding.dissonance.evidence.disagreement' }],
            confidence: 0.7,
            rank: 1,
          },
        ],
      } as never,
    });

    expect(facts.map((f) => f.label)).toEqual(['Pourquoi', 'Signaux']);
    expect(facts.some((f) => /récupération|sommeil|charge du jour/i.test(f.label))).toBe(false);
    expect(facts.some((f) => /^\d+$/.test(f.value))).toBe(false);
  });

  it('buildTodayWhyFacts can surface a non-overlapping note', () => {
    const facts = buildTodayWhyFacts({
      verdict: 'TRAIN_SMART',
      consistency: 'ALIGNED',
      whyFocus: 'readiness',
      decision: {
        supportingEvidence: [
          {
            id: 'e1',
            domain: 'RECOVERY',
            severity: 'INFO',
            title: { code: 'reasoning.finding.dissonance.title' },
            evidenceItems: [{ code: 'reasoning.finding.dissonance.evidence.prioritiseObjective' }],
            confidence: 0.8,
            rank: 1,
          },
        ],
      } as never,
    });

    expect(facts[0]).toMatchObject({ label: 'Pourquoi', value: 'Qualité d’abord' });
    expect(facts.some((f) => f.label === 'À noter')).toBe(true);
  });

  it('buildTodayLimitingFacts keeps frein + cause only', () => {
    const { facts, emptyText } = buildTodayLimitingFacts({
      limitingFactor: {
        system: 'RECOVERY',
        actionable: true,
        description: {
          code: 'reasoning.limitingFactor.recovery.deficit',
          params: { limiter: 'loadContext' },
        },
      },
    });

    expect(emptyText).toBeNull();
    expect(facts).toEqual([
      { label: 'Frein', value: 'Récupération' },
      { label: 'Cause', value: "Charge d'entraînement" },
    ]);
  });
});
