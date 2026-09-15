import { describe, expect, it } from 'vitest';
import {
  athletePackTierSummary,
  packTierConfidenceBarsTone,
  packTierInkDotClass,
} from './pack-tier-athlete';

describe('athletePackTierSummary', () => {
  it('maps FULL to Complet (never raw FULL)', () => {
    expect(athletePackTierSummary('FULL')).toBe('Complet');
    expect(athletePackTierSummary('FULL')).not.toMatch(/\bFULL\b/);
  });

  it('keeps Estimation partielle for PARTIAL and LOW', () => {
    expect(athletePackTierSummary('PARTIAL')).toBe('Estimation partielle');
    expect(athletePackTierSummary('LOW')).toBe('Estimation partielle');
  });

  it('maps INSUFFICIENT to Données insuffisantes', () => {
    expect(athletePackTierSummary('INSUFFICIENT')).toBe('Données insuffisantes');
  });
});

describe('packTierInkDotClass', () => {
  it('keeps Lime Pulse for FULL', () => {
    expect(packTierInkDotClass('FULL')).toContain('bg-highlight');
    expect(packTierInkDotClass('FULL')).not.toContain('signal-caution');
  });

  it('uses caution amber for PARTIAL and LOW', () => {
    expect(packTierInkDotClass('PARTIAL')).toBe('bg-signal-caution');
    expect(packTierInkDotClass('LOW')).toBe('bg-signal-caution');
  });

  it('uses muted gray for INSUFFICIENT', () => {
    expect(packTierInkDotClass('INSUFFICIENT')).toContain('ink-surface-foreground');
    expect(packTierInkDotClass('INSUFFICIENT')).not.toContain('highlight');
    expect(packTierInkDotClass('INSUFFICIENT')).not.toContain('signal-caution');
  });
});

describe('packTierConfidenceBarsTone', () => {
  it('maps tiers to bar tones', () => {
    expect(packTierConfidenceBarsTone('FULL')).toBe('highlight');
    expect(packTierConfidenceBarsTone('PARTIAL')).toBe('caution');
    expect(packTierConfidenceBarsTone('LOW')).toBe('caution');
    expect(packTierConfidenceBarsTone('INSUFFICIENT')).toBe('muted');
  });
});
