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
    error: null,
    submit: vi.fn(),
    refresh: vi.fn(),
  }),
}));

/* Session-link suggestions read demo mode — no Clerk in node tests. */
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
    expect(html).toContain('Actions du jour');
    expect(html).toContain('analysis-panel border-analysis-border/80');
    expect(html).toContain('rounded-analysis-lg');
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
    expect(mainSource).toContain('TodayCriticalStatus');
    expect(dashboardSource).toContain('onWellnessCompleted={() => void query.refetch()}');
  });

  it('keeps one-decision hierarchy with goal, briefing, why under the plate', () => {
    // Verdict → goal anchor → briefing → why → action row → Comprendre → journal.
    expect(mainSource).toContain('TodayGoalAnchor');
    expect(mainSource).toContain('DailyBriefingPanel');
    expect(mainSource).toContain('TodayWhyBlock');
    expect(mainSource).toContain('TodayActionRow');
    expect(mainSource).toContain('TodayUnderstandSection');
    expect(mainSource).toContain('TodayJournalHabitBridgeFooter');
    expect(mainSource).toContain('TodayCriticalStatus');
    // Signal strip must not sit as primary under the hero in TodayDashboardMain.
    expect(mainSource).not.toMatch(/TodayVerdictHero[\s\S]*TodaySignalStrip/);
    expect(mainSource).toContain('metricsRow={content.hero.metricsRow}');
    expect(mainSource).toContain('signalPreviews={content.hero.signalPreviews}');
  });
});

describe('TodayVerdictHero decision plate', () => {
  const heroSource = readFileSync(
    resolve(process.cwd(), 'src/components/today/rich/today-verdict-hero.tsx'),
    'utf8',
  );
  const partsSource = readFileSync(
    resolve(process.cwd(), 'src/components/today/rich/today-verdict-hero-parts.tsx'),
    'utf8',
  );

  it('orders posture → headline → action → Limité par → confidence', () => {
    const body = heroSource.slice(heroSource.indexOf('return ('));
    expect(body).toContain('TodayVerdictContextLabel');
    expect(body).toContain('TodayVerdictHeadline');
    expect(body).toContain('TodayVerdictActionLine');
    expect(body).toContain('TodayVerdictLimiter');
    expect(body).toContain('TodayVerdictConfidence');
    const postureAt = body.indexOf('TodayVerdictContextLabel');
    const headlineAt = body.indexOf('TodayVerdictHeadline');
    const actionAt = body.indexOf('TodayVerdictActionLine');
    const limiterAt = body.indexOf('TodayVerdictLimiter');
    const confidenceAt = body.indexOf('TodayVerdictConfidence');
    expect(postureAt).toBeLessThan(headlineAt);
    expect(headlineAt).toBeLessThan(actionAt);
    expect(actionAt).toBeLessThan(limiterAt);
    expect(limiterAt).toBeLessThan(confidenceAt);
  });

  it('does not mount the goal chip or orphan Pourquoi link on the plate', () => {
    expect(heroSource).not.toContain('TodayVerdictGoalBadge');
    expect(heroSource).not.toContain('goalLine');
    expect(partsSource).not.toContain('Pourquoi');
    expect(partsSource).toContain('Limité par ·');
  });

  it('reveals once via FadeIn with prefers-reduced-motion-safe press on the frein', () => {
    expect(heroSource).toContain('FadeIn');
    expect(partsSource).toContain('motion-safe:active:scale-[var(--press-scale-small)]');
  });
});

describe('Today goal and why wiring', () => {
  const mainSource = readFileSync(
    resolve(process.cwd(), 'src/components/today/today-dashboard-main.tsx'),
    'utf8',
  );
  const goalCardsSource = readFileSync(
    resolve(process.cwd(), 'src/components/goals/cards/goal-cards.tsx'),
    'utf8',
  );

  it('keeps goal anchor outside the plate and deep-links objectifs cards', () => {
    expect(mainSource).toContain('content.hero.goalHref');
    expect(mainSource).toContain('content.hero.goalLinkedToSession');
    expect(goalCardsSource).toContain('goalDomId(goal.id)');
  });
});
