import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  ActivityCompositionSkeleton,
  ActivityDetailSkeleton,
  ActivityMetricStripSkeleton,
  ActivityPerformanceSkeleton,
} from './activity-detail-skeleton';

describe('ActivityDetailSkeleton', () => {
  it('map layout mirrors outdoor reading: instruments, coach|map, Performance, rhythm splits', () => {
    const html = renderToStaticMarkup(createElement(ActivityDetailSkeleton, { layout: 'map' }));

    expect(html).toContain('Performance');
    expect(html).toContain('Profils');
    expect(html).toContain('Splits');
    expect(html).toContain('activity-log-coach');
    expect(html).toContain('activity-log-field');
    expect(html).toContain('activity-log-evidence');
    expect(html).toContain('order-1');
    expect(html).toContain('order-2');
    expect(html).toContain('grid-cols-2');
    expect(html).toContain('h-80');
  });

  it('strength layout shows exercise rows instead of a map', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityDetailSkeleton, { layout: 'strength' }),
    );
    expect(html).toContain('activity-log-field');
    expect(html).toContain('size-12');
    expect(html).not.toContain('h-80 w-full rounded-xl');
    expect(html).not.toContain('Performance');
  });

  it('no-map layout keeps coach reading without a route plane', () => {
    const html = renderToStaticMarkup(createElement(ActivityDetailSkeleton, { layout: 'no-map' }));
    expect(html).toContain('activity-log-coach');
    expect(html).toContain('Performance');
    expect(html).not.toContain('h-80 w-full rounded-xl');
    expect(html).not.toContain('>Splits<');
  });
});

describe('ActivityCompositionSkeleton', () => {
  it('puts coach before map; coach stays first on desktop too', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityCompositionSkeleton, { withCoach: true, withMap: true }),
    );
    expect(html).toContain('activity-log-coach');
    expect(html).toContain('activity-log-evidence');
    expect(html).toContain('order-1');
    expect(html).toContain('order-2');
    expect(html).not.toContain('lg:order-2');
  });

  it('can omit the map for pool swim / indoor', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityCompositionSkeleton, { withCoach: true, withMap: false }),
    );
    expect(html).toContain('activity-log-coach');
    expect(html).not.toContain('h-80');
  });
});

describe('ActivityMetricStripSkeleton', () => {
  it('renders logbook instrument fields', () => {
    const html = renderToStaticMarkup(createElement(ActivityMetricStripSkeleton, { count: 3 }));
    expect(html).toContain('activity-log-field');
    expect(html).toContain('grid-cols-2');
  });
});

describe('ActivityPerformanceSkeleton', () => {
  it('renders a log surface with spaced rows, not hairline dividers', () => {
    const html = renderToStaticMarkup(createElement(ActivityPerformanceSkeleton, { count: 4 }));
    expect(html).toContain('Performance');
    expect(html).toContain('activity-log-coach');
    expect(html).not.toContain('divide-analysis-border/60');
    expect(html).not.toContain('chip-surface');
  });
});
