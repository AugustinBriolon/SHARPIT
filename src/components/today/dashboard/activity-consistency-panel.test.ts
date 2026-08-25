import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityConsistencyPanel } from './activity-consistency-panel';

describe('ActivityConsistencyPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-28T09:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('puts the 8-week strip under the readings, full width, no fil caption', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityConsistencyPanel, {
        activities: [
          { date: new Date('2026-07-28T07:00:00Z'), load: 55 },
          { date: new Date('2026-07-20T07:00:00Z'), load: 42 },
        ],
      }),
    );

    expect(html).toContain('faites cette semaine');
    expect(html).toContain('semaines tenues');
    expect(html).toContain('de suite');
    expect(html).toContain('Séances / semaine');
    expect(html).toContain('flex-col gap-2.5');
    expect(html).toContain('flex-1');
    expect(html).toContain('rounded-[3px]');
    expect(html).toContain('href="/training"');
    expect(html).toContain('min-h-11');
    expect(html).not.toContain('fil tenu depuis');
    expect(html).not.toContain('sur 8 semaines');
    expect(html).toContain('text-data');
    expect(html).toContain('text-2xl');
    expect(html).toContain('Semaine du');
  });

  it('keeps an open week readable when today is still empty', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityConsistencyPanel, {
        activities: [{ date: new Date('2026-07-21T07:00:00Z'), load: 40 }],
      }),
    );

    expect(html).toContain('cette semaine encore ouverte');
    expect(html).toContain('celle-ci encore ouverte');
    expect(html).not.toContain('fil tenu depuis');
  });

  it('keeps a path to training when the window is still quiet', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityConsistencyPanel, {
        activities: [],
      }),
    );

    expect(html).toContain('Voir l’historique');
    expect(html).toContain('href="/training"');
    expect(html).toContain('semaines tenues');
  });
});
