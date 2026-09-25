import { describe, expect, it } from 'vitest';
import { equipmentSportsForPracticed } from '@/lib/practiced-sports';
import {
  availabilityStepAllowsSkip,
  equipmentStepAllowsSkip,
  nextOnboardingStep,
  ONBOARDING_STEP_LABELS,
  ONBOARDING_STEPS,
  parseOnboardingStepParam,
  previousOnboardingStep,
  stepAfterAvailability,
  stepAfterEquipment,
} from './wizard-steps';

describe('onboarding wizard step order', () => {
  it('orders Sports → Equipment → Availability → Intention → Sources', () => {
    expect(ONBOARDING_STEPS).toEqual([
      'sports',
      'equipment',
      'availability',
      'intention',
      'providers',
    ]);
    expect(nextOnboardingStep('sports')).toBe('equipment');
    expect(nextOnboardingStep('equipment')).toBe('availability');
    expect(nextOnboardingStep('availability')).toBe('intention');
    expect(nextOnboardingStep('intention')).toBe('providers');
    expect(nextOnboardingStep('providers')).toBe('complete');
  });

  it('labels five header steps, numbering left to the rail', () => {
    expect(ONBOARDING_STEP_LABELS.sports).toBe('Sports');
    expect(ONBOARDING_STEP_LABELS.equipment).toBe('Équipement');
    expect(ONBOARDING_STEP_LABELS.availability).toBe('Disponibilités');
    expect(ONBOARDING_STEP_LABELS.intention).toBe('Intention');
    expect(ONBOARDING_STEP_LABELS.providers).toBe('Sources');
  });

  // Equipment and Availability are both constraints — they belong before the goal.
  it('chains Equipment → Availability → Intention', () => {
    expect(stepAfterEquipment()).toBe('availability');
    expect(stepAfterAvailability()).toBe('intention');
    expect(previousOnboardingStep('availability')).toBe('equipment');
    expect(previousOnboardingStep('intention')).toBe('availability');
  });

  it('allows skipping Equipment and Availability without selection', () => {
    expect(equipmentStepAllowsSkip()).toBe(true);
    expect(availabilityStepAllowsSkip()).toBe(true);
  });

  it('parses ?step= query for deep links including availability', () => {
    expect(parseOnboardingStepParam('equipment')).toBe('equipment');
    expect(parseOnboardingStepParam('availability')).toBe('availability');
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
