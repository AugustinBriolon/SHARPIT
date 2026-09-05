import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActivityType } from '@prisma/client';
import type { HikeTripSummary } from '@/lib/activity/hike/hike-trip-summary';
import { buildHikeTripBandMetrics, HikeTripInkBand } from './hike-trip-ink-band';
import { HikeTripTimelineList, RemoveMemberButton } from './hike-trip-timeline';
import { HikeTripWaypoints } from './hike-trip-waypoints';

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

const member = {
  id: 'a1',
  type: ActivityType.HIKE,
  date: new Date('2026-08-06T09:00:00'),
  title: 'Refuge du Plan',
  duration: 7200,
  load: 42,
  observedLocationLabel: 'Chamonix',
  hikeMetrics: { distanceM: 9000, elevationM: 600, elevationLossM: 400 },
};

describe('buildHikeTripBandMetrics', () => {
  it('keeps the three headline totals in reading order', () => {
    expect(buildHikeTripBandMetrics(summary).map((m) => m.label)).toEqual([
      'Distance',
      'D+ cumulé',
      'Durée',
    ]);
  });

  it('splits the unit off the value so it can be set smaller', () => {
    const [distance, elevation, duration] = buildHikeTripBandMetrics(summary);

    expect(distance).toMatchObject({ value: '18.50', unit: 'km' });
    expect(elevation).toMatchObject({ value: '1200', unit: 'm' });
    // No unit to split out of “5h00”.
    expect(duration.value).toBe('5h00');
    expect(duration.unit).toBeUndefined();
  });

  it('omits a missing total instead of rendering a zero', () => {
    const metrics = buildHikeTripBandMetrics({ ...summary, distanceM: null, elevationM: null });
    expect(metrics.map((m) => m.label)).toEqual(['Durée']);
  });
});

describe('HikeTripInkBand', () => {
  it('renders identity, date range and aggregated totals', () => {
    const html = renderToStaticMarkup(
      createElement(HikeTripInkBand, { name: 'Queyras · août', profile: null, summary }),
    );

    expect(html).toContain('Queyras · août');
    expect(html).toContain('2 étapes');
    expect(html).toContain('18.50');
    expect(html).toContain('km');
    expect(html).toContain('1200');
    expect(html).toContain('surface-ink');
  });
});

describe('HikeTripTimelineList', () => {
  it('renders member title, step index and detail link', () => {
    const html = renderToStaticMarkup(createElement(HikeTripTimelineList, { members: [member] }));

    expect(html).toContain('Refuge du Plan');
    expect(html).toContain('/activite/a1');
    expect(html).toContain('>1</span>');
  });
});

describe('HikeTripWaypoints', () => {
  it('renders nothing when no location was observed', () => {
    expect(renderToStaticMarkup(createElement(HikeTripWaypoints, { labels: [] }))).toBe('');
  });

  it('renders each observed location', () => {
    const html = renderToStaticMarkup(
      createElement(HikeTripWaypoints, { labels: ['Chamonix', 'Argentière'] }),
    );
    expect(html).toContain('Chamonix');
    expect(html).toContain('Argentière');
  });
});

describe('RemoveMemberButton', () => {
  it('wraps disabled button so tooltip title is on a hoverable element', () => {
    const html = renderToStaticMarkup(
      createElement(RemoveMemberButton, { disabled: true, onRemove: () => {} }),
    );
    expect(html).toContain('title="Ajoute une étape ou supprime le séjour"');
    expect(html).toContain('disabled=""');
  });
});
