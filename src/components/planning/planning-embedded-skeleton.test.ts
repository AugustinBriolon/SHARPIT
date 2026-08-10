import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PlanningEmbeddedSkeleton } from '@/components/planning/planning-embedded-skeleton';

describe('PlanningEmbeddedSkeleton', () => {
  it('renders week summary pulses and seven day rows', () => {
    const html = renderToStaticMarkup(createElement(PlanningEmbeddedSkeleton));

    expect(html).toContain('analysis-panel');
    expect(html).toContain('aria-busy');
    expect(html.match(/h-12 w-full/g)?.length).toBe(7);
  });
});
