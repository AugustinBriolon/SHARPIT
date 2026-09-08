import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActivityType } from '@prisma/client';

vi.mock('@/hooks/use-data', () => ({
  useActivityStream: () => ({
    data: null,
    isPending: false,
    isError: false,
    isFetched: true,
  }),
}));

import { ActivityChip } from '@/components/training/activity/list/activity-list-chip';
import type { ActivityListItem } from '@/components/training/activity/list/activity-list-types';

function stubListItem(overrides: Partial<ActivityListItem> = {}): ActivityListItem {
  return {
    id: 'act-1',
    type: ActivityType.RUN,
    date: new Date('2026-09-05T12:00:00'),
    title: 'Sortie tempo',
    duration: 3600,
    load: 42,
    rpe: null,
    weather: null,
    runMetrics: { distanceM: 10000 },
    bikeMetrics: null,
    swimMetrics: null,
    hikeMetrics: null,
    strengthSets: [],
    plannedSession: null,
    hikeTripId: null,
    ...overrides,
  };
}

describe('ActivityChip', () => {
  it('renders CompletedSessionPreview with title and distance KPI', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityChip, {
        activity: stubListItem(),
      }),
    );
    expect(html).toContain('Sortie tempo');
    expect(html).toContain('/activite/act-1');
    expect(html).toContain('Distance');
    expect(html).toContain('analysis-panel');
  });

  it('uses a selection surface instead of the preview link', () => {
    const html = renderToStaticMarkup(
      createElement(ActivityChip, {
        activity: stubListItem({ type: ActivityType.HIKE, hikeTripId: null }),
        selectionMode: true,
        selected: false,
      }),
    );
    expect(html).toContain('<button');
    expect(html).not.toContain('/activite/act-1');
  });
});
