import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TodayInstrumentCard, TodayInstrumentCardSkeleton } from './today-instrument-card';

describe('TodayInstrumentCard', () => {
  it('renders title, optional subtitle, and icon well inside the chip shell', () => {
    const html = renderToStaticMarkup(
      createElement(
        TodayInstrumentCard,
        {
          href: '/plan/semaine',
          icon: createElement('span', { 'data-icon': 'pulse' }),
          subtitle: 'Cette semaine',
          title: 'Régularité',
        },
        createElement('span', null, 'body'),
      ),
    );

    expect(html).toContain('Régularité');
    expect(html).toContain('Cette semaine');
    expect(html).toContain('icon-well');
    expect(html).toContain('chip-surface-lg');
    expect(html).toContain('href="/plan/semaine"');
    expect(html).toContain('body');
    expect(html).not.toContain('text-label');
  });

  it('keeps a neutral chip surface without limiter wash', () => {
    const html = renderToStaticMarkup(
      createElement(TodayInstrumentCard, {
        href: '/today',
        icon: createElement('span'),
        title: 'Score récupération',
      }),
    );

    expect(html).toContain('chip-surface-lg');
    expect(html).not.toContain('bg-signal-caution/8');
    expect(html).not.toContain('border-signal-caution/45');
  });

  // One filled surface on every block flattens the hierarchy it was meant to
  // create, so context-level evidence keeps the hairline and drops the fill.
  it('drops the fill on the quiet tier, and keeps skeleton and card on the same one', () => {
    const card = renderToStaticMarkup(
      createElement(TodayInstrumentCard, {
        href: '/plan/semaine',
        icon: createElement('span'),
        tier: 'quiet',
        title: 'Régularité',
      }),
    );

    expect(card).toContain('chip-surface-quiet');
    expect(card).not.toContain('chip-surface-lg');

    const skeleton = renderToStaticMarkup(
      createElement(
        TodayInstrumentCardSkeleton,
        { tier: 'quiet', title: 'Régularité' },
        createElement('span'),
      ),
    );

    expect(skeleton).toContain('chip-surface-quiet');
    expect(skeleton).not.toContain('chip-surface-lg');
  });

  it('renders a static shell when href is omitted (nested controls)', () => {
    const html = renderToStaticMarkup(
      createElement(
        TodayInstrumentCard,
        {
          icon: createElement('span'),
          title: 'Plan vivant',
        },
        createElement('button', { type: 'button' }, 'Ajuster le planning'),
      ),
    );

    expect(html).toContain('<article');
    expect(html).not.toContain('href=');
    expect(html).toContain('Ajuster le planning');
  });
});
