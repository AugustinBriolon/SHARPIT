import { describe, expect, it } from 'vitest';
import {
  resolveConfidenceHref,
  resolveLimitingFactorHref,
  TWIN_DRILL_DOWN,
} from './today-twin-navigation';

describe('today-twin-navigation', () => {
  it('maps limiting factor systems to twin pages', () => {
    expect(
      resolveLimitingFactorHref({ system: 'RECOVERY', description: null, actionable: true }),
    ).toBe(TWIN_DRILL_DOWN.recovery);
    expect(
      resolveLimitingFactorHref({ system: 'FATIGUE', description: null, actionable: true }),
    ).toBe(TWIN_DRILL_DOWN.effort);
    expect(
      resolveLimitingFactorHref({ system: 'ADAPTATION', description: null, actionable: true }),
    ).toBe(TWIN_DRILL_DOWN.adaptation);
    expect(resolveLimitingFactorHref(null)).toBeNull();
  });

  it('maps confidence to the attention priority model', () => {
    expect(resolveConfidenceHref({ systemAttentionPriority: 'FATIGUE' } as never)).toBe(
      TWIN_DRILL_DOWN.effort,
    );
    expect(resolveConfidenceHref({ systemAttentionPriority: 'ADAPTATION' } as never)).toBe(
      TWIN_DRILL_DOWN.adaptation,
    );
    expect(resolveConfidenceHref({ systemAttentionPriority: 'RECOVERY' } as never)).toBe(
      TWIN_DRILL_DOWN.recovery,
    );
    expect(resolveConfidenceHref(null)).toBe(TWIN_DRILL_DOWN.recovery);
  });
});
