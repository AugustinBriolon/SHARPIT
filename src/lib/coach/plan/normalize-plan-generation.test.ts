import { describe, expect, it } from 'vitest';
import {
  normalizeCoachPlanGeneration,
  normalizePlanStartTime,
} from '@/lib/coach/plan/normalize-plan-generation';

describe('normalizePlanStartTime', () => {
  it('pads single-digit hours', () => {
    expect(normalizePlanStartTime('9:00')).toBe('09:00');
  });

  it('keeps valid HH:mm', () => {
    expect(normalizePlanStartTime('12:15')).toBe('12:15');
  });

  it('drops empty and garbage', () => {
    expect(normalizePlanStartTime('')).toBeNull();
    expect(normalizePlanStartTime('null')).toBeNull();
    expect(normalizePlanStartTime('midi')).toBeNull();
  });
});

describe('normalizeCoachPlanGeneration', () => {
  it('rounds floats and coerces invented strength enums to null', () => {
    const result = normalizeCoachPlanGeneration({
      summary: 'Semaine légère',
      sessions: [
        {
          dayOffset: 1.2,
          startTime: '9:00',
          type: 'STRENGTH',
          intensity: 'RECOVERY',
          title: 'Renfo bassin',
          description: 'Focus hanche',
          durationMin: 45.4,
          load: 30.6,
          rationale: 'Prévention genou',
          strengthPrescription: {
            sets: [
              {
                exercise: 'Clamshell',
                intent: 'STRENGTH',
                pattern: 'HIP_FLEXION_INVENTED',
                sets: 3,
                reps: 15,
                notes: 'ok',
              },
              {
                exercise: 'Planche',
                intent: 'CORE',
                pattern: 'CORE_ANTI_LATERAL',
                sets: 2.2,
                reps: 0,
                durationSec: 30,
              },
            ],
          },
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const [session] = result.plan.sessions;
    expect(session.dayOffset).toBe(1);
    expect(session.startTime).toBe('09:00');
    expect(session.durationMin).toBe(45);
    expect(session.load).toBe(31);
    expect(session.strengthPrescription?.sets[0]).toMatchObject({
      exercise: 'Clamshell',
      intent: 'STRENGTH',
      pattern: null,
    });
    expect(session.strengthPrescription?.sets[1]).toMatchObject({
      exercise: 'Planche',
      pattern: 'CORE_ANTI_LATERAL',
      sets: 2,
      reps: 0,
      durationSec: 30,
    });
  });

  it('rejects empty session lists', () => {
    const result = normalizeCoachPlanGeneration({ summary: 'x', sessions: [] });
    expect(result.ok).toBe(false);
  });
});
