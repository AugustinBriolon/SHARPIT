import { describe, expect, it } from 'vitest';
import {
  clampSeverity,
  impactChoiceFromFunctionalImpact,
  impactForTrend,
  impactToFunctionalImpact,
  severityForTrend,
  TREND_SEVERITY_STEP,
} from './reassessment-input';

describe('severityForTrend', () => {
  it('moves the reading by one step, in the right direction', () => {
    expect(severityForTrend(5, 'better')).toBe(5 - TREND_SEVERITY_STEP);
    expect(severityForTrend(5, 'worse')).toBe(5 + TREND_SEVERITY_STEP);
  });

  it('keeps the current reading on "pareil" rather than resetting it', () => {
    expect(severityForTrend(7, 'same')).toBe(7);
  });

  it('never leaves the 0-10 scale', () => {
    expect(severityForTrend(1, 'better')).toBe(0);
    expect(severityForTrend(9, 'worse')).toBe(10);
  });

  it('starts from the middle when nothing was recorded yet', () => {
    expect(severityForTrend(null, 'same')).toBe(5);
  });
});

describe('impactForTrend', () => {
  it('walks one notch at a time, never skipping from stopped to normal', () => {
    expect(impactForTrend('better', 'stopped')).toBe('reduced');
    expect(impactForTrend('better', 'reduced')).toBe('normal');
    expect(impactForTrend('worse', 'normal')).toBe('reduced');
    expect(impactForTrend('worse', 'reduced')).toBe('stopped');
  });

  it('leaves the declared impact alone when nothing changed', () => {
    expect(impactForTrend('same', 'reduced')).toBe('reduced');
    expect(impactForTrend('same', null)).toBe('normal');
  });
});

describe('impactToFunctionalImpact', () => {
  it('maps the three athlete choices onto the engine levels', () => {
    expect(impactToFunctionalImpact('normal')).toBe('NONE');
    expect(impactToFunctionalImpact('reduced')).toBe('MODERATE');
    expect(impactToFunctionalImpact('stopped')).toBe('STOPPED');
  });
});

describe('impactChoiceFromFunctionalImpact', () => {
  it('reads an engine level back into the three-choice UI', () => {
    expect(impactChoiceFromFunctionalImpact('NONE')).toBe('normal');
    expect(impactChoiceFromFunctionalImpact('MILD')).toBe('normal');
    expect(impactChoiceFromFunctionalImpact('MODERATE')).toBe('reduced');
    expect(impactChoiceFromFunctionalImpact('LIMITING')).toBe('reduced');
    expect(impactChoiceFromFunctionalImpact('STOPPED')).toBe('stopped');
    expect(impactChoiceFromFunctionalImpact(null)).toBeNull();
  });
});

describe('clampSeverity', () => {
  it('keeps whole numbers inside the scale', () => {
    expect(clampSeverity(-3)).toBe(0);
    expect(clampSeverity(12)).toBe(10);
    expect(clampSeverity(4.6)).toBe(5);
  });
});
