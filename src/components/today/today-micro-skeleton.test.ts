import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { TodayDashboardShell } from '@/components/today/today-dashboard-shell';
import { isPresentationValuesLoading } from '@/hooks/use-presentation-view-model';
import { todayLoadingShell } from '@/lib/presentation/today-loading-shell';
import { AppModalProvider } from '@/providers/app-modal-provider';

vi.mock('@/hooks/use-data', () => ({
  usePlannedSessions: () => ({
    data: [],
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useGoals: () => ({ data: [] }),
}));

vi.mock('@/hooks/use-wellness-checkin', () => ({
  useWellnessCheckin: () => ({
    completed: false,
    loading: false,
    isPending: false,
    submitting: false,
    error: null,
    submit: vi.fn(),
    refresh: vi.fn(),
  }),
}));

/* TodayActionRow gates ExpertModeToggle on demo — no Clerk in node tests. */
vi.mock('@/hooks/use-is-demo-mode', () => ({
  useIsDemoMode: () => false,
}));

function renderTodayShell() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AppModalProvider, null, createElement(TodayDashboardShell)),
    ),
  );
}

describe('today hub loading gate', () => {
  it('treats cold start and placeholder as values-loading', () => {
    expect(isPresentationValuesLoading({ isPending: true, isPlaceholderData: false })).toBe(true);
    expect(isPresentationValuesLoading({ isPending: false, isPlaceholderData: true })).toBe(true);
  });

  it('does not flash on background refetch of the same day', () => {
    expect(isPresentationValuesLoading({ isPending: false, isPlaceholderData: false })).toBe(false);
  });

  it('provides stable chrome labels without numeric verdicts', () => {
    const shell = todayLoadingShell(new Date('2026-07-21T08:00:00'));
    expect(shell.hero.eyebrow).toBe('Ce matin');
    expect(shell.hero.headline).toBe('');
    expect(shell.whyBlock.visible).toBe(false);
    expect(shell.actionRow.actionLabel.length).toBeGreaterThan(0);
  });
});

describe('TodayDashboardShell', () => {
  it('renders verdict and action loading regions', () => {
    const html = renderTodayShell();
    expect(html).toContain('surface-ink');
    expect(html).toContain('text-verdict');
    expect(html).toContain('text-label');
    expect(html).toContain('chip-surface rounded-analysis');
    expect(html).toContain('aria-busy="true"');
  });
});

describe('TodayDashboard loading gate contract', () => {
  const dashboardSource = readFileSync(
    resolve(process.cwd(), 'src/components/today/today-dashboard.tsx'),
    'utf8',
  );
  const viewSource = readFileSync(
    resolve(process.cwd(), 'src/components/today/today-dashboard-view.ts'),
    'utf8',
  );
  const viewsSource = readFileSync(
    resolve(process.cwd(), 'src/components/today/today-dashboard-views.tsx'),
    'utf8',
  );
  const mainSource = readFileSync(
    resolve(process.cwd(), 'src/components/today/today-dashboard-main.tsx'),
    'utf8',
  );

  it('uses shell only on cold start without vm', () => {
    expect(viewSource).toMatch(/if\s*\(\s*valuesLoading\s*&&\s*!vm\s*\)/);
    expect(viewsSource).toContain('<TodayDashboardShell trainingDayId={trainingDayId} />');
  });

  it('keeps placeholder SWR tree with loading props and wellness refetch', () => {
    expect(mainSource).toContain('loading={valuesLoading}');
    expect(mainSource).toMatch(/!valuesLoading\s*&&\s*content\.statusMessage/);
    expect(dashboardSource).toContain('onWellnessCompleted={() => void query.refetch()}');
  });
});
