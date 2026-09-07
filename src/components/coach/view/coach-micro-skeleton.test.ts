import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  CoachChatEmptyChrome,
  CoachChatPanelSkeleton,
  CoachConversationListSkeleton,
  CoachHubSkeleton,
  CoachMobileSelectLoadingRow,
} from '@/components/coach/view/coach-hub-skeleton';

function renderWithQuery(node: ReactNode): string {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderToStaticMarkup(createElement(QueryClientProvider, { client }, node));
}

describe('coach hub micro-skeleton', () => {
  it('renders immersive fixed shell above the floating tab bar', () => {
    const html = renderWithQuery(createElement(CoachHubSkeleton));
    expect(html).toContain('fixed inset-x-0 top-0');
    expect(html).toContain('--bottom-nav-offset');
    expect(html).toContain('safe-area-top');
    expect(html).not.toContain('Fil &amp; conversations');
    expect(html).not.toContain('Mémoire &amp; contexte');
  });

  it('deprecated mobile select loading is a no-op after immersive redesign', () => {
    const html = renderToStaticMarkup(createElement(CoachMobileSelectLoadingRow));
    expect(html).toBe('');
  });

  it('deprecated desktop list skeleton is a no-op after immersive redesign', () => {
    const html = renderToStaticMarkup(createElement(CoachConversationListSkeleton));
    expect(html).toBe('');
  });

  it('panel shell uses the rounded prompt bar with beUI composer chrome', () => {
    const html = renderWithQuery(createElement(CoachChatEmptyChrome));
    expect(html).toContain('Demande conseil à ton coach');
    expect(html).toContain('rounded-full');
    expect(html).toContain('data-coach-promptbar');
    expect(html).not.toContain('Comment se présente ma forme');
  });

  it('thread skeleton keeps real composer chrome and coach bubble surface', () => {
    const html = renderWithQuery(createElement(CoachChatPanelSkeleton));
    expect(html).toContain('aria-busy');
    expect(html).toContain('Demande conseil à ton coach');
    expect(html).toContain('rounded-full');
    expect(html).toContain('rounded-[18px_18px_4px_18px]');
    expect(html).toContain('max-w-2xl');
  });

  it('thread skeleton can show a pending context tag while discuss resolves', () => {
    const html = renderWithQuery(createElement(CoachChatPanelSkeleton, { contextPending: true }));
    expect(html).toContain('animate-pulse');
    expect(html).toContain('rounded-full');
  });
});
