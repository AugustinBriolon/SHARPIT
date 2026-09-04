import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { DailyBriefingPanel } from './daily-briefing-panel';

vi.mock('@/hooks/use-coach', () => ({
  useDailyBriefing: vi.fn(),
}));

import { useDailyBriefing } from '@/hooks/use-coach';

const useDailyBriefingMock = vi.mocked(useDailyBriefing);

function renderPanel(dayKey = '2026-09-02') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderToStaticMarkup(
    createElement(QueryClientProvider, { client }, createElement(DailyBriefingPanel, { dayKey })),
  );
}

describe('DailyBriefingPanel', () => {
  it('hides while the persisted briefing is loading', () => {
    useDailyBriefingMock.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    } as never);
    expect(renderPanel()).toBe('');
  });

  it('shows a single pending line when no briefing exists', () => {
    useDailyBriefingMock.mockReturnValue({
      data: null,
      isPending: false,
      isError: false,
    } as never);
    expect(renderPanel()).toContain('Briefing dès que les données sont à jour');
    expect(renderPanel()).not.toContain('Lorem');
  });

  it('renders the persisted briefing body for disclosure', () => {
    useDailyBriefingMock.mockReturnValue({
      data: {
        id: 'b1',
        date: '2026-09-02',
        content: 'Journée active — récupère bien.\n\nCoucher vers 20:57.',
        readiness: 72,
        generatedAt: new Date('2026-09-02T07:00:00Z'),
      },
      isPending: false,
      isError: false,
    } as never);
    const html = renderPanel();
    expect(html).toContain('Lire le briefing');
    expect(html).not.toMatch(/Lire Le briefing/);
    // Single title surface: aria-label only while collapsed (no duplicate h2 in body).
    expect(html).toContain('aria-label="Briefing du jour"');
    expect(html).not.toMatch(/text-section-title[^>]*>Briefing du jour/);
    expect(html).toContain('Journée active');
  });
});
