import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActivityType } from '@prisma/client';

import { InstrumentListChip, splitInstrumentMeta } from './instrument-list-chip';

describe('splitInstrumentMeta', () => {
  it('splits joined secondary lines', () => {
    expect(splitInstrumentMeta('30 min · 5.01 km')).toEqual(['30 min', '5.01 km']);
  });

  it('returns empty for blank', () => {
    expect(splitInstrumentMeta(null)).toEqual([]);
    expect(splitInstrumentMeta('  ')).toEqual([]);
  });
});

describe('InstrumentListChip', () => {
  it('renders title, type label, and meta without dumping codes', () => {
    const html = renderToStaticMarkup(
      createElement(InstrumentListChip, {
        href: '/training/1',
        title: 'Sortie tempo',
        activityType: ActivityType.RUN,
        meta: ['30 min', '5.01 km'],
      }),
    );
    expect(html).toContain('Sortie tempo');
    expect(html).toContain('Course');
    expect(html).toContain('30 min');
    expect(html).toContain('5.01 km');
    expect(html).not.toMatch(/>CO</);
  });

  it('marks done sessions', () => {
    const html = renderToStaticMarkup(
      createElement(InstrumentListChip, {
        href: '/training/1',
        title: 'Séance faite',
        activityType: ActivityType.BIKE,
        done: true,
      }),
    );
    expect(html).toContain('Séance faite');
    expect(html).toContain('Vélo');
  });

  it('renders the Lime Pulse pastille only for the primary element', () => {
    const primaryHtml = renderToStaticMarkup(
      createElement(InstrumentListChip, {
        href: '/training/1',
        title: 'Tempo du jour',
        primary: true,
      }),
    );
    expect(primaryHtml).toContain('bg-highlight');

    const secondaryHtml = renderToStaticMarkup(
      createElement(InstrumentListChip, {
        href: '/training/2',
        title: 'Sortie longue',
      }),
    );
    expect(secondaryHtml).not.toContain('bg-highlight');
  });

  it('keeps the muted → affordance for done sessions even when primary', () => {
    const html = renderToStaticMarkup(
      createElement(InstrumentListChip, {
        href: '/training/1',
        title: 'Séance faite',
        done: true,
        primary: true,
      }),
    );
    expect(html).not.toContain('bg-highlight');
  });

  it('renders a button when onClick is used without href', () => {
    const html = renderToStaticMarkup(
      createElement(InstrumentListChip, {
        title: 'Tempo planifié',
        activityType: ActivityType.RUN,
        onClick: () => undefined,
      }),
    );
    expect(html).toContain('<button');
    expect(html).toContain('Tempo planifié');
    expect(html).not.toContain('<a ');
  });
});
