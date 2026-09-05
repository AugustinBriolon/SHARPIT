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
          href: '/training',
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
    expect(html).toContain('href="/training"');
    expect(html).toContain('body');
    expect(html).not.toContain('text-label');
  });

  it('marks the limiter with a caution wash', () => {
    const html = renderToStaticMarkup(
      createElement(TodayInstrumentCard, {
        href: '/today',
        icon: createElement('span'),
        isLimiter: true,
        title: 'Score récupération',
      }),
    );

    expect(html).toContain('bg-signal-caution/8');
    expect(html).toContain('border-signal-caution/45');
  });
});
