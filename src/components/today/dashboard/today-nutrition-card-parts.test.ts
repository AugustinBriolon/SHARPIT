import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MacroProgressRing, MacroRingCell } from './today-nutrition-card-parts';

describe('MacroProgressRing', () => {
  it('draws no progress arc when pct is null (no goals / empty day)', () => {
    const html = renderToStaticMarkup(
      createElement(MacroProgressRing, { kind: 'protein', pct: null }),
    );

    expect(html).not.toContain('stroke-dashoffset');
    expect(html).not.toContain('0.92');
  });

  it('draws no progress arc when pct is zero', () => {
    const html = renderToStaticMarkup(createElement(MacroProgressRing, { kind: 'carbs', pct: 0 }));

    expect(html).not.toContain('stroke-dashoffset');
  });

  it('draws a progress arc when there is fill', () => {
    const html = renderToStaticMarkup(createElement(MacroProgressRing, { kind: 'fat', pct: 40 }));

    expect(html).toContain('stroke-dashoffset');
  });
});

describe('MacroRingCell', () => {
  it('forces an empty ring when grams are zero even if pct is set', () => {
    const html = renderToStaticMarkup(
      createElement(MacroRingCell, {
        goal: 120,
        grams: 0,
        kind: 'protein',
        pct: 8,
      }),
    );

    expect(html).toContain('0/120g');
    expect(html).not.toContain('stroke-dashoffset');
  });
});
