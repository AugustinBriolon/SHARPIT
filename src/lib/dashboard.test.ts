import { describe, expect, it } from 'vitest';
import { buildTrainingVerdict } from './dashboard';

describe('buildTrainingVerdict day context', () => {
  it('valorise une journée active en fin de journée', () => {
    const verdict = buildTrainingVerdict({
      readinessScore: 80,
      readinessTone: 'good',
      tsb: -5,
      acwr: 1.1,
      dayContext: {
        isViewingToday: true,
        hour: 19,
        activitiesToday: { count: 1, totalLoad: 80, sportLabels: ['Natation'] },
        plannedRemaining: 0,
        deepFatigue: false,
        highLoad: false,
      },
    });
    expect(verdict.tone).toBe('good');
    expect(verdict.title).toContain('entraînement');
    expect(verdict.message).toMatch(/objectif|récupération/i);
  });

  it('garde le verdict matinal sans séance faite', () => {
    const verdict = buildTrainingVerdict({
      readinessScore: 80,
      readinessTone: 'good',
      tsb: 5,
      acwr: 1.0,
      dayContext: {
        isViewingToday: true,
        hour: 8,
        activitiesToday: { count: 0, totalLoad: 0, sportLabels: [] },
        plannedRemaining: 1,
        deepFatigue: false,
        highLoad: false,
      },
    });
    expect(verdict.tone).toBe('good');
  });

  it('reste prudent si fatigue profonde malgré séance faite', () => {
    const verdict = buildTrainingVerdict({
      readinessScore: 35,
      readinessTone: 'low',
      tsb: -35,
      acwr: 1.1,
      dayContext: {
        isViewingToday: true,
        hour: 19,
        activitiesToday: { count: 1, totalLoad: 80, sportLabels: ['Natation'] },
        plannedRemaining: 0,
        deepFatigue: true,
        highLoad: false,
      },
    });
    expect(verdict.tone).toBe('low');
  });
});
