import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  ActivityCompositionSkeleton,
  ActivityDetailSkeleton,
  ActivityMetricStripSkeleton,
} from './activity-detail-skeleton';

describe('ActivityDetailSkeleton', () => {
  it('map layout mirrors coach-first composition with route plane', () => {
    const html = renderToStaticMarkup(createElement(ActivityDetailSkeleton, { layout: 'map' }));

    expect(html).toContain('Lecture du coach');
    expect(html).toContain('chip-surface');
    expect(html).toContain('order-1');
    expect(html).toContain('lg:order-2');
    expect(html).toContain('sm:grid-cols-4');
    expect(html).toContain('h-80');
  });

  it('strength layout shows exercise rows instead of a map', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityDetailSkeleton, { layout: 'strength' }),
    );
    expect(html).toContain('chip-surface');
    expect(html).toContain('size-12');
    expect(html).not.toContain('Lecture du coach');
    expect(html).not.toContain('h-80 w-full rounded-xl');
  });

  it('no-map layout keeps coach reading without a route plane', () => {
    const html = renderToStaticMarkup(createElement(ActivityDetailSkeleton, { layout: 'no-map' }));
    expect(html).toContain('Lecture du coach');
    expect(html).not.toContain('h-80 w-full rounded-xl');
  });
});

describe('ActivityCompositionSkeleton', () => {
  it('puts coach before map on mobile order', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityCompositionSkeleton, { withCoach: true, withMap: true }),
    );
    expect(html).toContain('Lecture du coach');
    expect(html).toContain('order-1');
    expect(html).toContain('lg:order-2');
    expect(html).toContain('order-2');
    expect(html).toContain('lg:order-1');
  });

  it('can omit the map for pool swim / indoor', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityCompositionSkeleton, { withCoach: true, withMap: false }),
    );
    expect(html).toContain('Lecture du coach');
    expect(html).not.toContain('h-80');
  });
});

describe('ActivityMetricStripSkeleton', () => {
  it('renders instrument chip surfaces', () => {
    const html = renderToStaticMarkup(createElement(ActivityMetricStripSkeleton, { count: 4 }));
    expect(html).toContain('chip-surface');
    expect(html).toContain('sm:grid-cols-4');
  });
});
