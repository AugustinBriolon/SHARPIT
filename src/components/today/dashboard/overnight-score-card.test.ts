import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('motion/react', () => ({
  useReducedMotion: () => true,
}));

const { OvernightScoreCard } = await import('./overnight-score-card');

describe('OvernightScoreCard', () => {
  it('uses caution tone on the trend well when the reading is down', () => {
    const html = renderToStaticMarkup(
      createElement(OvernightScoreCard, {
        accent: 'sleep',
        baselineDetail: 'Sommeil profond -21 min vs moy.',
        baselineTitle: 'Sous ta moyenne',
        href: '/today/sleep',
        icon: 'moon',
        score: 64,
        statusLabel: 'Sommeil correct',
        subtitle: 'Nuit dernière · 6h 56m',
        title: 'Score sommeil',
        trend: 'down',
      }),
    );

    expect(html).toContain('bg-signal-caution/15');
    expect(html).toContain('text-signal-caution');
    expect(html).not.toContain('bg-highlight/40');
  });

  it('keeps Lime Pulse on an upward trend', () => {
    const html = renderToStaticMarkup(
      createElement(OvernightScoreCard, {
        accent: 'recovery',
        baselineDetail: '+4 vs hier',
        baselineTitle: 'Au-dessus de ta baseline',
        href: '/today/recovery',
        icon: 'heart',
        score: 72,
        statusLabel: 'Bonne récupération',
        subtitle: null,
        title: 'Score récupération',
        trend: 'up',
      }),
    );

    expect(html).toContain('bg-highlight/40');
    expect(html).not.toContain('bg-signal-caution/15');
  });

  it('shares the instrument card chrome for title and icon', () => {
    const html = renderToStaticMarkup(
      createElement(OvernightScoreCard, {
        accent: 'sleep',
        baselineDetail: null,
        baselineTitle: null,
        href: '/today/sleep',
        icon: 'moon',
        score: null,
        statusLabel: null,
        subtitle: 'Nuit dernière',
        title: 'Score sommeil',
        trend: null,
      }),
    );

    expect(html).toContain('Score sommeil');
    expect(html).toContain('Nuit dernière');
    expect(html).toContain('icon-well');
    expect(html).toContain('chip-surface-lg');
  });
});
