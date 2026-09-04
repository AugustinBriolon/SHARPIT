import { describe, expect, it } from 'vitest';
import { equipmentSportsForPracticed } from '@/lib/practiced-sports';
import {
  equipmentStepAllowsSkip,
  nextOnboardingStep,
  ONBOARDING_STEP_LABELS,
  ONBOARDING_STEPS,
  parseOnboardingStepParam,
  previousOnboardingStep,
  stepAfterEquipment,
} from './wizard-steps';

describe('onboarding wizard step order', () => {
  it('orders Sports → Equipment → Intention → Sources', () => {
    expect(ONBOARDING_STEPS).toEqual(['sports', 'equipment', 'intention', 'providers']);
    expect(nextOnboardingStep('sports')).toBe('equipment');
    expect(nextOnboardingStep('equipment')).toBe('intention');
    expect(nextOnboardingStep('intention')).toBe('providers');
    expect(nextOnboardingStep('providers')).toBe('complete');
  });

  it('labels four header steps including Équipement, numbering left to the rail', () => {
    expect(ONBOARDING_STEP_LABELS.sports).toBe('Sports');
    expect(ONBOARDING_STEP_LABELS.equipment).toBe('Équipement');
    expect(ONBOARDING_STEP_LABELS.intention).toBe('Intention');
    expect(ONBOARDING_STEP_LABELS.providers).toBe('Sources');
  });

  it('sends Equipment continue to Intention, not Sources', () => {
    expect(stepAfterEquipment()).toBe('intention');
    expect(previousOnboardingStep('intention')).toBe('equipment');
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
