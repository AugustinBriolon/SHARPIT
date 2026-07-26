import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

import { InstrumentMetricChip, InstrumentMetricGrid } from './instrument-metric-chip';

describe('InstrumentMetricChip', () => {
  it('keeps values overflow-visible and non-truncating', () => {
    const html = renderToStaticMarkup(
      createElement(InstrumentMetricChip, {
        label: 'Allure',
        value: '4\'32"/km',
      }),
    );
    expect(html).toContain('overflow-visible');
    expect(html).toContain('whitespace-nowrap');
    expect(html).not.toContain('truncate');
    expect(html).toContain('4&#x27;32&quot;/km');
  });
});

describe('InstrumentMetricGrid', () => {
  it('renders a responsive strip/grid shell', () => {
    const html = renderToStaticMarkup(
      createElement(InstrumentMetricGrid, {
        items: [
          { label: 'Distance', value: '10.2 km' },
          { label: 'FC moy.', value: '152 bpm' },
        ],
      }),
    );
    expect(html).toContain('snap-x');
    expect(html).toContain('sm:grid');
    expect(html).toContain('Distance');
    expect(html).toContain('152 bpm');
  });
});
