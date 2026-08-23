import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { HikeTripsListSkeleton } from '@/components/training/trip/hike-trips-list';

describe('HikeTripsListSkeleton', () => {
  it('renders trips header and three pulse chips', () => {
    const html = renderToStaticMarkup(createElement(HikeTripsListSkeleton));

    expect(html).toContain('Séjours');
    expect(html).toContain('Ma semaine');
    expect(html).toContain('chip-surface-lg');
    expect(html.match(/chip-surface-lg/g)?.length).toBe(3);
  });
});
