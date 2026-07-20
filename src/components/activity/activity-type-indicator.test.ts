import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActivityType } from '@prisma/client';

import { ActivityTypeIndicator } from './activity-type-indicator';

describe('ActivityTypeIndicator', () => {
  it('defaults to readable French labels', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityTypeIndicator, { type: ActivityType.RUN }),
    );
    expect(html).toContain('Course');
    expect(html).not.toMatch(/>CO</);
  });

  it('keeps dense codes for calendar variant', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityTypeIndicator, {
        type: ActivityType.STRENGTH,
        variant: 'code',
      }),
    );
    expect(html).toContain('MU');
    expect(html).not.toContain('Musculation');
  });

  it('uses rose surface for strength (not Lime Pulse)', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityTypeIndicator, { type: ActivityType.STRENGTH }),
    );
    expect(html).toContain('Musculation');
    expect(html).toContain('rose');
    expect(html).not.toContain('bg-highlight');
  });

  it('uses teal surface for triathlon (distinct from strength)', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityTypeIndicator, { type: ActivityType.TRIATHLON }),
    );
    expect(html).toContain('Triathlon');
    expect(html).toContain('teal');
  });

  it('labels swim and bike clearly', () => {
    expect(
      renderToStaticMarkup(createElement(ActivityTypeIndicator, { type: ActivityType.SWIM })),
    ).toContain('Natation');
    expect(
      renderToStaticMarkup(createElement(ActivityTypeIndicator, { type: ActivityType.BIKE })),
    ).toContain('Vélo');
  });
});
