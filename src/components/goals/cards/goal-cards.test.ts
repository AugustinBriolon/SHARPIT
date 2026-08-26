import { GoalKind, GoalPriority } from '@prisma/client';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

vi.mock('@/hooks/use-data', () => ({
  useGoalMutations: () => ({
    update: { mutate: vi.fn(), isPending: false },
    remove: { mutate: vi.fn(), isPending: false },
  }),
}));

vi.mock('@/components/ui/confirm-dialog', () => ({
  useConfirmDialog: () => ({
    confirm: vi.fn(),
    dialog: null,
  }),
}));

vi.mock('@/components/coach/discuss-with-coach-button', () => ({
  DiscussWithCoachButton: ({ label }: { label: string }) =>
    createElement('a', { href: '/coach' }, label),
}));

const { RaceCard, MetricGoalCard } = await import('./goal-cards');

const raceGoal = {
  id: 'race-1',
  title: 'Ironman Nice',
  kind: GoalKind.RACE,
  horizon: null,
  startValue: null,
  currentValue: null,
  targetValue: null,
  unit: null,
  lowerIsBetter: false,
  targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  location: 'Nice',
  achieved: false,
  notes: null,
  priority: GoalPriority.A,
  raceFormat: 'Ironman',
  targetPerformance: 'Sous 11 h',
};

describe('goal cards instrument reading', () => {
  it('shows priority meaning without risk/caution fills or trophy chrome', () => {
    const html = renderToStaticMarkup(createElement(RaceCard, { goal: raceGoal }));

    expect(html).toContain('Objectif A');
    expect(html).toContain('Course principale');
    expect(html).toContain('Fenêtre d’affûtage');
    expect(html).toContain('text-primary');
    expect(html).toContain('Discuter');
    expect(html).toContain('Actions de l’objectif');
    expect(html).not.toContain('bg-signal-risk');
    expect(html).not.toContain('bg-signal-caution');
    expect(html).not.toContain('opacity-60');
  });

  it('keeps achieved as an explicit status line, not opacity', () => {
    const html = renderToStaticMarkup(
      createElement(MetricGoalCard, {
        goal: {
          ...raceGoal,
          id: 'metric-1',
          kind: GoalKind.METRIC,
          title: 'FTP',
          priority: null,
          raceFormat: null,
          targetPerformance: null,
          location: null,
          achieved: true,
          lastAchievedAt: '2026-06-01T00:00:00.000Z',
          currentValue: 280,
          targetValue: 300,
          unit: 'W',
        },
      }),
    );

    expect(html).toContain('Objectif atteint');
    expect(html).toContain('border-primary');
    expect(html).not.toContain('opacity-60');
  });

  it('puts mark/edit/delete behind the actions menu, not equal ghost buttons', () => {
    const html = renderToStaticMarkup(createElement(RaceCard, { goal: raceGoal }));

    expect(html).toContain('Actions de l’objectif');
    expect(html).toContain('Discuter');
    expect(html).toContain('dropdown-menu-trigger');
    expect(html).not.toContain('hover:text-destructive');
    expect(html).not.toContain('Marquer atteint');
  });
});
