import { describe, expect, it } from 'vitest';
import {
  planningComplianceView,
  planningDoneAccessibleName,
  planningDoneMetrics,
  planningSessionMode,
} from './planning-day-display';

describe('planningSessionMode', () => {
  it('settles a linked session only once the day is past', () => {
    expect(planningSessionMode({ completed: true, activityId: 'a1', isPastDay: true })).toBe(
      'done',
    );
  });

  it("keeps today's realised session in full — it is still today's work", () => {
    expect(planningSessionMode({ completed: true, activityId: 'a1', isPastDay: false })).toBe(
      'planned',
    );
  });

  it('keeps an upcoming session planned', () => {
    expect(planningSessionMode({ completed: false, activityId: null, isPastDay: false })).toBe(
      'planned',
    );
  });

  it('calls a past session without an activity missed', () => {
    expect(planningSessionMode({ completed: false, activityId: null, isPastDay: true })).toBe(
      'missed',
    );
  });

  it('does not trust completed without a linked activity', () => {
    // The flag alone can be set by hand; the activity is what proves it happened.
    expect(planningSessionMode({ completed: true, activityId: null, isPastDay: true })).toBe(
      'missed',
    );
  });
});

describe('planningComplianceView', () => {
  it('states the verdict and the score when the analysis landed', () => {
    expect(planningComplianceView({ complianceScore: 88, verdict: 'AS_PLANNED' })).toEqual({
      label: 'Conforme',
      score: 88,
      colorClass: 'text-primary',
    });
  });

  it('colours a drifting session without shaming it', () => {
    expect(planningComplianceView({ complianceScore: 72, verdict: 'SHORTER' })).toMatchObject({
      label: 'Plus court',
      colorClass: 'text-signal-caution',
    });
  });

  it('shows nothing until the analysis exists', () => {
    expect(planningComplianceView(null)).toBeNull();
    expect(planningComplianceView({})).toBeNull();
    expect(planningComplianceView({ complianceScore: 88 })).toBeNull();
    expect(planningComplianceView({ complianceScore: '88', verdict: 'AS_PLANNED' })).toBeNull();
  });
});

describe('planningDoneMetrics', () => {
  it('joins what the sport actually has', () => {
    expect(planningDoneMetrics({ durationSec: 3600, distanceM: 12000 })).toContain('·');
    expect(planningDoneMetrics({ durationSec: 1800, distanceM: null })).not.toContain('·');
    expect(planningDoneMetrics({ durationSec: null, distanceM: null })).toBe('');
    expect(planningDoneMetrics({ durationSec: 0, distanceM: 0 })).toBe('');
  });
});

describe('planningDoneAccessibleName', () => {
  it('leads with the outcome', () => {
    expect(
      planningDoneAccessibleName({
        title: 'Sortie longue',
        mode: 'done',
        compliance: { label: 'Conforme', score: 88, colorClass: 'text-primary' },
      }),
    ).toBe('Sortie longue, réalisée, Conforme, conformité 88 sur 100');

    expect(
      planningDoneAccessibleName({ title: 'Fractionné', mode: 'missed', compliance: null }),
    ).toBe('Fractionné, non réalisée');

    expect(planningDoneAccessibleName({ title: 'Natation', mode: 'done', compliance: null })).toBe(
      'Natation, réalisée',
    );
  });
});
