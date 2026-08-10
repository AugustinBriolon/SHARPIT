import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CalendarSkeleton } from '@/components/calendar/calendar-view';

describe('CalendarSkeleton', () => {
  it('renders month grid without header when showHeader is false', () => {
    const html = renderToStaticMarkup(createElement(CalendarSkeleton, { showHeader: false }));

    expect(html).not.toContain('w-24');
    expect(html).toContain('grid-cols-7');
    expect(html.match(/min-h-24/g)?.length).toBe(35);
  });

  it('renders toolbar chrome when showHeader is true', () => {
    const html = renderToStaticMarkup(createElement(CalendarSkeleton, { showHeader: true }));

    expect(html).toContain('w-24');
    expect(html).toContain('size-10');
  });
});
