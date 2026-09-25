import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActivityType } from '@prisma/client';

import { BrickOverviewCard } from './brick-overview-card';

describe('BrickOverviewCard', () => {
  it('shows every leg without a disclosure control', () => {
    const html = renderToStaticMarkup(
      createElement(BrickOverviewCard, {
        legs: [
          {
            id: 'leg-1',
            type: ActivityType.BIKE,
            title: 'Vélo',
            durationMin: 60,
            intensity: 'ENDURANCE',
            completed: false,
            activityId: null,
          },
          {
            id: 'leg-2',
            type: ActivityType.RUN,
            title: 'Course',
            durationMin: 30,
            intensity: 'ENDURANCE',
            completed: false,
            activityId: null,
          },
        ],
        onOpenLeg: vi.fn(),
      }),
    );

    expect(html).toContain('Brick · Vélo → Course');
    expect(html).toContain('Vélo');
    expect(html).toContain('Course');
    expect(html).not.toContain('aria-expanded');
    expect(html).not.toContain('ChevronDown');
  });
});
