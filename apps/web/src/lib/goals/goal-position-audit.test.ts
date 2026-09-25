import { describe, expect, it } from 'vitest';
import { buildGoalPositionAudit, resolveFeasibilityHorizon } from '@/lib/goals/goal-position-audit';

describe('resolveFeasibilityHorizon', () => {
  it('picks the smallest supported horizon that covers the countdown', () => {
    expect(resolveFeasibilityHorizon(null)).toBe(7);
    expect(resolveFeasibilityHorizon(40)).toBe(14);
  });
});

describe('buildGoalPositionAudit', () => {
  it('frames a race as target vs projected finish — unavailable when no predictor', () => {
    const audit = buildGoalPositionAudit({
      goalTitle: 'Half IronMan',
      isRace: true,
      detail: 'Sub 5h00',
      currentLabel: null,
      targetLabel: null,
      gapLabel: null,
      progress: null,
      countdown: 'J-27',
      countdownCaption: 'jours restants',
    });

    expect(audit.value).toBe('—');
    expect(audit.hint).toBe('vs Sub 5h00');
    expect(audit.comparison).toBe('unavailable');
    expect(audit.targetLabel).toBe('Sub 5h00');
    expect(audit.projectedLabel).toBeNull();
    expect(audit.legs).toEqual([]);
    expect(audit.statusBody).toMatch(/Manque preuves/i);
    expect(audit.whenLine).toBe('J-27 · jours restants');
  });

  it('shows projected finish vs target when a predictor is wired', () => {
    const audit = buildGoalPositionAudit({
      goalTitle: 'Semi',
      isRace: true,
      detail: '1:30:00',
      currentLabel: null,
      targetLabel: null,
      gapLabel: null,
      progress: null,
      countdown: 'J-40',
      countdownCaption: 'jours restants',
      projectedFinishLabel: '1:28:10',
      projectedGapLabel: '1:50 sous la cible',
      projectedLegs: [
        {
          kind: 'run',
          label: 'Semi',
          timeLabel: '1:28:10',
          sharePct: 100,
          source: 'Riegel · 10 km',
        },
      ],
    });

    expect(audit.comparison).toBe('projected');
    expect(audit.value).toBe('1:28:10');
    expect(audit.hint).toBe('vs 1:30:00');
    expect(audit.gapLabel).toBe('1:50 sous la cible');
    expect(audit.legs).toHaveLength(1);
    expect(audit.statusBody).toBe('');
  });

  it('shows metric current/target as measured comparison', () => {
    const audit = buildGoalPositionAudit({
      goalTitle: '5K',
      isRace: false,
      detail: '22:40 / 20:00',
      currentLabel: '22:40',
      targetLabel: '20:00',
      gapLabel: '2:40 encore à gagner sur la mesure',
      progress: 40,
      countdown: null,
      countdownCaption: null,
    });

    expect(audit.comparison).toBe('measured');
    expect(audit.value).toBe('22:40');
    expect(audit.hint).toBe('vs 20:00');
    expect(audit.targetLabel).toBe('20:00');
    expect(audit.projectedLabel).toBe('22:40');
    expect(audit.gapLabel).toMatch(/2:40/);
  });

  it('marks metric done when progress is complete', () => {
    const audit = buildGoalPositionAudit({
      goalTitle: '5K',
      isRace: false,
      detail: '19:50 / 20:00',
      currentLabel: '19:50',
      targetLabel: '20:00',
      gapLabel: 'Cible atteinte',
      progress: 100,
      countdown: null,
      countdownCaption: null,
    });

    expect(audit.tone).toBe('done');
    expect(audit.hint).toBe('Cible atteinte');
  });
});
