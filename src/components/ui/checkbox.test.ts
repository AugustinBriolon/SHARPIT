import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  it('renders Base UI control with instrument surface', () => {
    const html = renderToStaticMarkup(
      createElement(Checkbox, {
        checked: true,
        onCheckedChange: vi.fn(),
        'aria-label': 'Test',
      }),
    );
    expect(html).toContain('data-slot="checkbox"');
    expect(html).toContain('role="checkbox"');
    expect(html).toContain('data-checked');
  });
});
