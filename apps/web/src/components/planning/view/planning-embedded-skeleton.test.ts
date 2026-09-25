import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PlanningEmbeddedSkeleton } from '@/components/planning/view/planning-embedded-skeleton';

describe('PlanningEmbeddedSkeleton', () => {
  it('renders week chrome pulses and seven overview day rows', () => {
    const html = renderToStaticMarkup(createElement(PlanningEmbeddedSkeleton));

    expect(html).toContain('aria-busy');
    expect(html.match(/h-14 w-full/g)?.length).toBe(7);
  });
});
