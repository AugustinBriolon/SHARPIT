import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { HikeOvernightSummary } from '@/lib/activity/hike-overnight-summary';
import { ActivityHikeOvernightPanel } from './activity-hike-overnight-panel';

const base: Omit<HikeOvernightSummary, 'variant'> = {
  startAt: new Date('2026-08-06T09:00:00'),
  endAt: new Date('2026-08-06T17:00:00'),
  durationSec: 8 * 3600,
  locationLabel: 'Chamonix',
  weather: 'Clear',
  load: 42,
  distanceM: 12000,
  elevationM: 800,
  elevationLossM: 750,
  endPoint: null,
  endLocationFallback: 'Chamonix',
};

describe('ActivityHikeOvernightPanel', () => {
  it('renders nothing for day hikes (metrics live in hero + specs)', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityHikeOvernightPanel, {
        summary: { ...base, variant: 'day', durationSec: 3600 },
      }),
    );
    expect(html).toBe('');
  });

  it('renders Nuitée panel for overnight hikes', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityHikeOvernightPanel, {
        summary: { ...base, variant: 'overnight' },
      }),
    );
    expect(html).toContain('Nuitée');
    expect(html).not.toContain('Synthèse');
    expect(html).toContain('Fenêtre');
  });
});
