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

  it('shows a day window with activity rings beside the weekly streak', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityConsistencyPanel, {
        activities: [
          { date: new Date('2026-07-28T07:00:00Z'), load: 55 },
          { date: new Date('2026-07-27T07:00:00Z'), load: 40 },
          { date: new Date('2026-07-20T07:00:00Z'), load: 42 },
        ],
      }),
    );

    expect(html).toContain('Régularité');
    expect(html).toContain('de suite');
    expect(html).toContain('semaines');
    expect(html).toContain('icon-well');
    expect(html).toContain('border-primary');
    expect(html).toContain('border-[2.5px]');
    expect(html).toContain('href="/training"');
    expect(html).toContain('text-[2.75rem]');
    expect(html).toContain('grid-template-columns');
    expect(html).toContain('icon-well');
    expect(html).toContain('28');
    expect(html).toContain('30');
    expect(html).not.toContain('flex-col-reverse');
    expect(html).not.toContain('Séances / semaine');
    expect(html).not.toContain('rounded-[3px]');
  });

  it('announces an open current week for screen readers', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityConsistencyPanel, {
        activities: [{ date: new Date('2026-07-21T07:00:00Z'), load: 40 }],
      }),
    );

    expect(html).toContain('Semaine courante encore ouverte');
    expect(html).toContain('de suite');
  });

  it('keeps a path to training when the window is still quiet', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityConsistencyPanel, {
        activities: [],
      }),
    );

    expect(html).toContain('Voir l’historique');
    expect(html).toContain('href="/training"');
    expect(html).toContain('de suite');
  });
});
