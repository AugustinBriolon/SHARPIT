import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TodayInstrumentCard } from './today-instrument-card';

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
});
