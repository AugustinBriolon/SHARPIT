import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OvernightScoreCard, tickStroke } from './overnight-score-card';

vi.mock('motion/react', () => ({
  useReducedMotion: () => true,
}));

describe('OvernightScoreCard loading chrome', () => {
  it('keeps static title and empty gauge when score is still unknown', () => {
    const html = renderToStaticMarkup(
      createElement(OvernightScoreCard, {
        accent: 'sleep',
        baselineDetail: null,
        baselineTitle: null,
        href: '/today/sleep',
        icon: 'moon',
        score: null,
        statusLabel: null,
        subtitle: null,
        title: 'Score sommeil',
        trend: null,
      }),
    );

    expect(html).toContain('Score sommeil');
    expect(html).toContain('icon-well');
    expect(html).toContain('sur 100');
    expect(html).toContain('—');
    expect(html).not.toContain('animate-pulse');
  });
});

describe('tickStroke', () => {
  it('stays on the border track when the score is unknown', () => {
    expect(tickStroke(0, null)).toBe('var(--color-border)');
    expect(tickStroke(51, null)).toBe('var(--color-border)');
  });

  it('inks ticks up to the score and leaves the rest on the track', () => {
    expect(tickStroke(0, 50)).toBe('var(--color-foreground)');
    expect(tickStroke(51, 50)).toBe('var(--color-border)');
  });
});
