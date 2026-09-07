import { describe, expect, it } from 'vitest';
import {
  ONBOARDING_STEP_COUNT,
  onboardingProgressLabel,
  onboardingProgressPercent,
  onboardingSegmentTicks,
  onboardingStepPosition,
  onboardingStepStatus,
} from './wizard-progress';
import { ONBOARDING_STEPS } from './wizard-steps';

describe('onboardingStepPosition', () => {
  it('numbers the four steps from one', () => {
    expect(onboardingStepPosition('sports')).toBe(1);
    expect(onboardingStepPosition('equipment')).toBe(2);
    expect(onboardingStepPosition('intention')).toBe(3);
    expect(onboardingStepPosition('providers')).toBe(4);
  });

  it('reads bootstrap as the wizard being behind us', () => {
    expect(onboardingStepPosition('bootstrap')).toBe(ONBOARDING_STEP_COUNT);
  });

  it('stays in sync with the canonical step list', () => {
    expect(ONBOARDING_STEP_COUNT).toBe(ONBOARDING_STEPS.length);
  });
});

describe('onboardingProgressPercent (inclusive fill)', () => {
  it('counts the current step as attained', () => {
    expect(onboardingProgressPercent('sports')).toBe(25);
    expect(onboardingProgressPercent('equipment')).toBe(50);
    expect(onboardingProgressPercent('intention')).toBe(75);
  });

  it('fills the rail on the last step', () => {
    expect(onboardingProgressPercent('providers')).toBe(100);
    expect(onboardingProgressPercent('bootstrap')).toBe(100);
  });

  it('never regresses as the athlete advances', () => {
    const percents = ONBOARDING_STEPS.map(onboardingProgressPercent);
    expect(percents).toEqual([...percents].sort((a, b) => a - b));
  });
});

describe('onboardingStepStatus', () => {
  it('splits past, current and upcoming around the active step', () => {
    expect(onboardingStepStatus('sports', 'intention')).toBe('done');
    expect(onboardingStepStatus('intention', 'intention')).toBe('current');
    expect(onboardingStepStatus('providers', 'intention')).toBe('upcoming');
  });

  it('marks every step done once bootstrap starts', () => {
    expect(onboardingStepStatus('sports', 'bootstrap')).toBe('done');
    expect(onboardingStepStatus('providers', 'bootstrap')).toBe('current');
  });
});

describe('onboardingProgressLabel (progressbar aria-valuetext)', () => {
  it('announces the count and the step name', () => {
    expect(onboardingProgressLabel('intention')).toBe('Étape 3 sur 4 · Intention');
  });

  it('announces completion on bootstrap', () => {
    expect(onboardingProgressLabel('bootstrap')).toBe('Étape 4 sur 4 · terminé');
  });
});

describe('onboardingSegmentTicks', () => {
  it('marks the boundaries between steps, never the rail ends', () => {
    expect(onboardingSegmentTicks()).toEqual([25, 50, 75]);
  });

  it('draws one tick fewer than there are steps', () => {
    expect(onboardingSegmentTicks()).toHaveLength(ONBOARDING_STEP_COUNT - 1);
  });
});
