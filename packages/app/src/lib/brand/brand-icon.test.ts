import { describe, expect, it } from 'vitest';

import {
  BRAND_ICON_DARK,
  BRAND_ICON_MASKABLE_CONTENT_RATIO,
  BRAND_MARK,
  brandIconSvg,
  brandMarkDots,
} from './brand-icon';

describe('brand icon', () => {
  it('draws the app icon: six dots on a hexagon', () => {
    expect(BRAND_MARK.dots).toHaveLength(6);
    expect(brandMarkDots('red').match(/<circle /g)).toHaveLength(6);
  });

  it('centres the mark at the icon scale on its canvas', () => {
    const svg = brandIconSvg({ width: 1000 });
    const scale = (1000 * 0.59) / BRAND_MARK.width;
    expect(svg).toContain(
      `translate(205 ${(1000 - BRAND_MARK.height * scale) / 2}) scale(${scale})`,
    );
    expect(svg).toContain('fill="url(#canvas)"');
  });

  it('leaves the ground transparent when asked for the mark alone', () => {
    expect(brandIconSvg({ width: 64, canvas: 'none' })).not.toContain('url(#canvas)"/>');
  });

  it('follows the viewer theme when adaptive', () => {
    const svg = brandIconSvg({ width: 64, canvas: 'adaptive' });
    expect(svg).toContain('@media (prefers-color-scheme: dark)');
    expect(svg).toContain(BRAND_ICON_DARK.canvasTop);
    expect(brandIconSvg({ width: 64 })).not.toContain('prefers-color-scheme');
  });

  it('keeps maskable content inside the W3C safe zone', () => {
    expect(BRAND_ICON_MASKABLE_CONTENT_RATIO).toBe(0.8);
  });
});
