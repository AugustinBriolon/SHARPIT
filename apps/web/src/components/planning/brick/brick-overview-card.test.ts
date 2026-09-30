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

describe('BrickOverviewCard · a brick under way', () => {
  const doneBike = {
    id: 'leg-1',
    type: ActivityType.BIKE,
    title: 'Vélo',
    durationMin: 85,
    intensity: 'TEMPO' as const,
    completed: true,
    activityId: 'act-bike',
    actual: { durationSec: 4_815, load: 95, rpe: 6, feeling: 'Bonnes jambes' },
  };
  const doneRun = {
    id: 'leg-2',
    type: ActivityType.RUN,
    title: 'Course',
    durationMin: 30,
    intensity: 'TEMPO' as const,
    completed: true,
    activityId: 'act-run',
    actual: { durationSec: 1_815, load: 41, rpe: 8, feeling: null },
  };

  it('shows each done leg’s duration, RPE and feeling, and the transition between them', () => {
    const html = renderToStaticMarkup(
      createElement(BrickOverviewCard, {
        legs: [doneBike, doneRun],
        transitionsSec: [124],
        onOpenLeg: vi.fn(),
      }),
    );

    expect(html).toContain('1h20');
    expect(html).toContain('RPE 6');
    expect(html).toContain('« Bonnes jambes »');
    expect(html).toContain('RPE 8');
    expect(html).toContain('T2');
    expect(html).toContain('2 min 04');
  });

  it('shows no transition row when it is unknown', () => {
    const html = renderToStaticMarkup(
      createElement(BrickOverviewCard, {
        legs: [doneBike, { ...doneRun, completed: false, activityId: null, actual: null }],
        transitionsSec: [null],
        onOpenLeg: vi.fn(),
      }),
    );
    expect(html).not.toContain('T2');
  });
});
