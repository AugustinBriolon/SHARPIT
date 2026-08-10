import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ProgressionHubSkeleton } from '@/components/training/hub/progression-hub-skeleton';

describe('ProgressionHubSkeleton', () => {
  it('renders back link, Progression header, État tab active, and panel pulse', () => {
    const html = renderToStaticMarkup(createElement(ProgressionHubSkeleton));

    expect(html).toContain('Progression');
    expect(html).toContain('Où tu en es maintenant');
    expect(html).toContain('État');
    expect(html).toContain('Records');
    expect(html).toContain('Calibration');
    expect(html).toContain('!bg-highlight');
    expect(html).toContain('h-64');
  });
});
