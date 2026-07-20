import { describe, expect, it } from 'vitest';

import { softTintFromQualityClass } from './physio-plate-tint';

describe('softTintFromQualityClass', () => {
  it('returns flat caution wash for caution/vo2/risk (and legacy amber/orange/red)', () => {
    expect(softTintFromQualityClass('text-signal-caution')).toBe(
      'bg-[var(--color-signal-caution)]/12',
    );
    expect(softTintFromQualityClass('text-signal-vo2')).toBe('bg-[var(--color-signal-caution)]/12');
    expect(softTintFromQualityClass('text-amber-600')).toBe('bg-[var(--color-signal-caution)]/12');
  });

  it('returns soft lime wash for primary/signal-recovery/emerald', () => {
    expect(softTintFromQualityClass('text-primary')).toBe('bg-highlight/35');
    expect(softTintFromQualityClass('text-[var(--color-signal-recovery)]')).toBe('bg-highlight/35');
    expect(softTintFromQualityClass('text-emerald-600')).toBe('bg-highlight/35');
  });

  it('returns tempo wash for signal-tempo', () => {
    expect(softTintFromQualityClass('text-[var(--color-signal-tempo)]')).toBe(
      'bg-[var(--color-signal-tempo)]/14',
    );
  });

  it('returns flat base wash for blue', () => {
    expect(softTintFromQualityClass('text-blue-600')).toBe('bg-[var(--color-signal-base)]/12');
  });

  it('never returns a gradient utility', () => {
    const tint = softTintFromQualityClass('text-emerald-600');
    expect(tint).toBeDefined();
    expect(tint).not.toContain('bg-linear');
    expect(tint).not.toContain('from-');
  });

  it('returns undefined for unknown or empty', () => {
    expect(softTintFromQualityClass(undefined)).toBeUndefined();
    expect(softTintFromQualityClass('text-muted-foreground')).toBeUndefined();
  });
});
