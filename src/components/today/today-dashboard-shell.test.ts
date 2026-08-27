import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { TodayDashboardShell } from './today-dashboard-shell';

vi.mock('@/hooks/use-viewport', () => ({ useIsMobile: () => false }));

/* The action row reaches for the session modal; the shell never opens one. */
vi.mock('@/providers/app-modal-provider', () => ({
  useAppModal: () => ({ openPlannedSession: vi.fn() }),
}));

/* TodayActionRow gates ExpertModeToggle on demo — no Clerk in node tests. */
vi.mock('@/hooks/use-is-demo-mode', () => ({
  useIsDemoMode: () => false,
}));

/**
 * The shell has to hold every section the loaded page holds. Anything missing
 * here appears out of nowhere when its data lands and pushes the rest down.
 */
describe('TodayDashboardShell', () => {
  const html = renderToStaticMarkup(createElement(TodayDashboardShell));

  it('holds the sections that were missing and made the page grow', () => {
    expect(html).toContain('Régularité');
    expect(html).toContain('Nutrition');
  });

  it('keeps the chrome that is structure rather than data', () => {
    expect(html).toContain('Aujourd’hui');
  });

  it('pulses values instead of inventing them', () => {
    expect(html).toContain('animate-pulse');
    expect(html).not.toMatch(/\d+ kcal/);
  });
});
