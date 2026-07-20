import { describe, expect, it } from 'vitest';

import {
  BRAND_ICON_DARK,
  BRAND_ICON_LIGHT,
  BRAND_ICON_MASKABLE_CONTENT_RATIO,
  BRAND_ICON_PATH,
} from './brand-icon';
import { BRAND } from './brand-tokens';

describe('brand icon', () => {
  it('uses Seed brand strokes (not legacy emerald)', () => {
    expect(BRAND_ICON_LIGHT.stroke).toBe(BRAND.interactivePrimary);
    expect(BRAND_ICON_DARK.stroke).toBe(BRAND.limePulse);
    expect(BRAND_ICON_LIGHT.stroke).not.toBe('#059669');
  });

  it('keeps maskable content inside the W3C safe zone', () => {
    expect(BRAND_ICON_MASKABLE_CONTENT_RATIO).toBe(0.8);
  });

  it('exposes a single activity-pulse path', () => {
    expect(BRAND_ICON_PATH).toContain('M22 12');
  });
});
