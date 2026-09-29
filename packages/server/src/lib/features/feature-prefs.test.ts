import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FEATURE_PREFS,
  mergeFeaturePrefs,
  resolveFeaturePrefs,
} from '@sharpit/server/lib/features/feature-prefs';

describe('feature prefs', () => {
  it('turns every feature on when nothing readable is stored', () => {
    expect(resolveFeaturePrefs(null)).toEqual(DEFAULT_FEATURE_PREFS);
    expect(resolveFeaturePrefs({ nutrition: 'no' })).toEqual(DEFAULT_FEATURE_PREFS);
  });

  it('keeps the other features when one is turned off', () => {
    const stored = mergeFeaturePrefs(null, { nutrition: false });
    const next = mergeFeaturePrefs(stored, { journal: false });

    expect(next).toEqual({ ...DEFAULT_FEATURE_PREFS, nutrition: false, journal: false });
  });

  it('turns everything back on with null', () => {
    expect(mergeFeaturePrefs({ version: 1, nutrition: false }, null)).toEqual(
      DEFAULT_FEATURE_PREFS,
    );
  });
});
