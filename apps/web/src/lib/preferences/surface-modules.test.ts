import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SURFACE_MODULES,
  parseSurfaceModulesPrefs,
  SURFACE_MODULE_IDS,
} from '@/lib/preferences/surface-modules';

describe('parseSurfaceModulesPrefs', () => {
  it('returns defaults for garbage input', () => {
    expect(parseSurfaceModulesPrefs(null)).toEqual(DEFAULT_SURFACE_MODULES);
    expect(parseSurfaceModulesPrefs({ version: 2 })).toEqual(DEFAULT_SURFACE_MODULES);
  });

  it('merges known module booleans and ignores unknown keys', () => {
    const parsed = parseSurfaceModulesPrefs({
      version: 1,
      modules: { nutrition: false, journal: true, mystery: true },
    });
    expect(parsed.modules.nutrition).toBe(false);
    expect(parsed.modules.journal).toBe(true);
    expect(parsed.modules.strength).toBe(DEFAULT_SURFACE_MODULES.modules.strength);
    for (const id of SURFACE_MODULE_IDS) {
      expect(typeof parsed.modules[id]).toBe('boolean');
    }
  });
});
