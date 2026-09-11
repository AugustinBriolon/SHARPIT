import { describe, expect, it } from 'vitest';
import {
  PLAN_COACH_INTENTION,
  PLAN_COACH_STEPS,
  TWIN_ADAPTATION_READING,
  resolvePlanCoachAccent,
} from '@/lib/plan/hub/plan-coach-offer';

describe('plan-coach-offer', () => {
  it('exposes one intention and three ranked steps', () => {
    expect(PLAN_COACH_INTENTION).toBe('Coacher mon objectif');
    expect(PLAN_COACH_STEPS.map((step) => step.id)).toEqual(['cadre', 'remplir', 'ajuster']);
    expect(PLAN_COACH_STEPS[0]?.href).toBeNull();
    expect(PLAN_COACH_STEPS[1]?.href).toContain('create=1');
    expect(PLAN_COACH_STEPS[2]?.href).toContain('adapt=1');
  });

  it('keeps Twin Adaptation copy distinct from Ajuster', () => {
    expect(TWIN_ADAPTATION_READING.title).toBe('Adaptation');
    expect(TWIN_ADAPTATION_READING.blurb.toLowerCase()).toContain('pas un ajustement');
    expect(PLAN_COACH_STEPS.some((step) => /adaptation/i.test(step.title))).toBe(false);
  });

  it('accents cadre when a dated goal has no macro', () => {
    expect(
      resolvePlanCoachAccent({
        hasDatedGoal: true,
        hasActiveMacro: false,
        hasRemainingSessions: false,
      }),
    ).toBe('cadre');
  });

  it('accents remplir when macro exists but the week has no remaining sessions', () => {
    expect(
      resolvePlanCoachAccent({
        hasDatedGoal: true,
        hasActiveMacro: true,
        hasRemainingSessions: false,
      }),
    ).toBe('remplir');
  });

  it('accents ajuster when sessions are already planned', () => {
    expect(
      resolvePlanCoachAccent({
        hasDatedGoal: true,
        hasActiveMacro: true,
        hasRemainingSessions: true,
      }),
    ).toBe('ajuster');
  });

  it('accents nothing without a dated goal', () => {
    expect(
      resolvePlanCoachAccent({
        hasDatedGoal: false,
        hasActiveMacro: false,
        hasRemainingSessions: true,
      }),
    ).toBeNull();
  });
});
