import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActivityType } from '@prisma/client';
import type { HikeTripSummary } from '@/lib/activity/hike-trip-summary';
import { HikeTripHero } from './hike-trip-hero';
import { HikeTripTimelineList } from './hike-trip-timeline';

const summary: HikeTripSummary = {
  memberCount: 2,
  startAt: new Date('2026-08-06T09:00:00'),
  endAt: new Date('2026-08-07T17:00:00'),
  durationSec: 5 * 3600,
  distanceM: 18500,
  elevationM: 1200,
  elevationLossM: 1100,
  load: 86,
  locationLabels: ['Chamonix'],
};

describe('HikeTripHero', () => {
  it('renders aggregated distance and duration metrics', () => {
    const html = renderToStaticMarkup(createElement(HikeTripHero, { summary }));
    expect(html).toContain('Distance');
    expect(html).toContain('18.50 km');
    expect(html).toContain('Durée');
    expect(html).toContain('D+');
    expect(html).toContain('Charge');
  });
});

describe('HikeTripTimelineList', () => {
  it('renders member title in timeline row', () => {
    const html = renderToStaticMarkup(
      createElement(HikeTripTimelineList, {
        members: [
          {
            id: 'a1',
            type: ActivityType.HIKE,
            date: new Date('2026-08-06T09:00:00'),
            title: 'Refuge du Plan',
            duration: 7200,
            load: 42,
            observedLocationLabel: 'Chamonix',
            hikeMetrics: {
              distanceM: 9000,
              elevationM: 600,
              elevationLossM: 400,
            },
          },
        ],
      }),
    );
    expect(html).toContain('Refuge du Plan');
    expect(html).toContain('/training/a1');
  });
});
