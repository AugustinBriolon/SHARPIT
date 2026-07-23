import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ConfidenceBars, confidenceBarsFromPct } from '@/components/ui/confidence-bars';

describe('ConfidenceBars', () => {
  it('uses primary bars by default', () => {
    const html = renderToStaticMarkup(createElement(ConfidenceBars, { filled: 2 }));
    expect(html).toContain('bg-primary');
    expect(html).not.toContain('bg-highlight');
  });

  it('uses Lime Pulse bars with highlight tone (ink band plate)', () => {
    const html = renderToStaticMarkup(
      createElement(ConfidenceBars, { filled: 2, tone: 'highlight' }),
    );
    expect(html).toContain('bg-highlight');
    expect(html).not.toContain('bg-primary');
  });
});

describe('confidenceBarsFromPct', () => {
  it('maps pct tiers to 0–3 bars', () => {
    expect(confidenceBarsFromPct(null)).toBe(0);
    expect(confidenceBarsFromPct(undefined)).toBe(0);
    expect(confidenceBarsFromPct(0)).toBe(0);
    expect(confidenceBarsFromPct(10)).toBe(1);
    expect(confidenceBarsFromPct(33)).toBe(1);
    expect(confidenceBarsFromPct(34)).toBe(2);
    expect(confidenceBarsFromPct(66)).toBe(2);
    expect(confidenceBarsFromPct(67)).toBe(3);
    expect(confidenceBarsFromPct(100)).toBe(3);
  });
});
