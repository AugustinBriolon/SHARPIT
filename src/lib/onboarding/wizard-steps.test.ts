import { describe, expect, it } from 'vitest';
import { equipmentSportsForPracticed } from '@/lib/practiced-sports';
import {
  equipmentStepAllowsSkip,
  nextOnboardingStep,
  ONBOARDING_STEP_LABELS,
  ONBOARDING_STEPS,
  parseOnboardingStepParam,
  previousOnboardingStep,
  stepAfterProviders,
} from './wizard-steps';

describe('onboarding wizard step order', () => {
  it('orders Sports → Intention → Sources → Equipment', () => {
    expect(ONBOARDING_STEPS).toEqual(['sports', 'intention', 'providers', 'equipment']);
    expect(nextOnboardingStep('sports')).toBe('intention');
    expect(nextOnboardingStep('intention')).toBe('providers');
    expect(nextOnboardingStep('providers')).toBe('equipment');
    expect(nextOnboardingStep('equipment')).toBe('complete');
  });

  it('labels four header steps including Équipement', () => {
    expect(ONBOARDING_STEP_LABELS.sports).toBe('1 · Sports');
    expect(ONBOARDING_STEP_LABELS.intention).toBe('2 · Intention');
    expect(ONBOARDING_STEP_LABELS.providers).toBe('3 · Sources');
    expect(ONBOARDING_STEP_LABELS.equipment).toBe('4 · Équipement');
  });

  it('sends Sources continue to Equipment, not bootstrap', () => {
    expect(stepAfterProviders()).toBe('equipment');
    expect(previousOnboardingStep('equipment')).toBe('providers');
  });

  it('allows skipping Equipment without selection', () => {
    expect(equipmentStepAllowsSkip()).toBe(true);
  });

  it('parses ?step= query for deep links including equipment', () => {
    expect(parseOnboardingStepParam('equipment')).toBe('equipment');
    expect(parseOnboardingStepParam('providers')).toBe('providers');
    expect(parseOnboardingStepParam(null)).toBe('sports');
  });
});

describe('onboarding Equipment filter-by-practiced-sports', () => {
  it('shows only run gear for a run-only athlete', () => {
    expect(equipmentSportsForPracticed(['run'])).toEqual(['RUN']);
  });

  it('adds strength venue/items when strength is practiced', () => {
    expect(equipmentSportsForPracticed(['run', 'strength'])).toEqual(['RUN', 'STRENGTH']);
  });

  it('expands triathlon to run+bike+swim gear', () => {
    expect(equipmentSportsForPracticed(['triathlon'])).toEqual(['RUN', 'BIKE', 'SWIM']);
  });
});
