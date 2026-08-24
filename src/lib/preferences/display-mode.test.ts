import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DISPLAY_MODE,
  filterByAudience,
  isDisplayMode,
  isExpertMode,
  isMetricVisible,
  toDisplayMode,
} from '@/lib/preferences/display-mode';

describe('display mode', () => {
  it('opens on the accessible reading', () => {
    expect(DEFAULT_DISPLAY_MODE).toBe('essential');
  });

  it('recognises only the two readings', () => {
    expect(isDisplayMode('essential')).toBe(true);
    expect(isDisplayMode('expert')).toBe(true);
    expect(isDisplayMode('advanced')).toBe(false);
    expect(isDisplayMode(undefined)).toBe(false);
  });

  it('falls back to essential rather than guessing', () => {
    expect(toDisplayMode('expert')).toBe('expert');
    expect(toDisplayMode(null)).toBe('essential');
    expect(toDisplayMode('EXPERT')).toBe('essential');
  });

  it('reads expert only for the expert mode', () => {
    expect(isExpertMode('expert')).toBe(true);
    expect(isExpertMode('essential')).toBe(false);
  });
});

describe('metric audience', () => {
  it('always shows core metrics', () => {
    expect(isMetricVisible('core', 'essential')).toBe(true);
    expect(isMetricVisible('core', 'expert')).toBe(true);
  });

  it('holds expert metrics back on the essential reading', () => {
    expect(isMetricVisible('expert', 'essential')).toBe(false);
    expect(isMetricVisible('expert', 'expert')).toBe(true);
  });

  it('treats an unmarked metric as core', () => {
    const metrics = [{ id: 'distance' }, { id: 'tss', audience: 'expert' as const }];

    expect(filterByAudience(metrics, 'essential').map((m) => m.id)).toEqual(['distance']);
    expect(filterByAudience(metrics, 'expert').map((m) => m.id)).toEqual(['distance', 'tss']);
  });

  it('keeps the source list untouched', () => {
    const metrics = [{ id: 'tss', audience: 'expert' as const }];
    filterByAudience(metrics, 'essential');
    expect(metrics).toHaveLength(1);
  });
});
