import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  CoachChatEmptyChrome,
  CoachChatPanelSkeleton,
  CoachConversationListSkeleton,
  CoachHubSkeleton,
  CoachMobileSelectLoadingRow,
} from '@/components/coach/coach-hub-skeleton';

describe('coach hub micro-skeleton', () => {
  it('renders mobile fixed shell and desktop sticky hub', () => {
    const html = renderToStaticMarkup(createElement(CoachHubSkeleton));
    expect(html).toContain('lg:hidden');
    expect(html).toContain('hidden space-y-6 lg:block');
    expect(html).toContain('Fil &amp; conversations');
    expect(html).toContain('Mémoire &amp; contexte');
    expect(html).not.toContain('Comment se présente ma forme');
  });

  it('mobile select loading only skeletons the label, keeps chevron and trash', () => {
    const html = renderToStaticMarkup(createElement(CoachMobileSelectLoadingRow));
    expect(html).toContain('aria-busy');
    expect(html).toContain('Supprimer la conversation');
    expect(html).not.toContain('size-8 shrink-0 rounded-md');
  });

  it('desktop list skeleton only value rows', () => {
    const html = renderToStaticMarkup(createElement(CoachConversationListSkeleton));
    expect(html).toContain('aria-busy');
    expect(html).not.toContain('Chargement');
  });

  it('panel shell uses the rounded composer card with beUI prompt send', () => {
    const html = renderToStaticMarkup(createElement(CoachChatEmptyChrome));
    expect(html).toContain('Demande conseil à ton coach');
    expect(html).toContain('rounded-[1.75rem]');
    expect(html).toContain('size-8 rounded-full');
    expect(html).not.toContain('aria-busy');
    expect(html).not.toContain('Comment se présente ma forme');
  });

  it('thread skeleton keeps real composer chrome and coach bubble surface', () => {
    const html = renderToStaticMarkup(createElement(CoachChatPanelSkeleton));
    expect(html).toContain('aria-busy');
    expect(html).toContain('Demande conseil à ton coach');
    expect(html).toContain('rounded-[1.75rem]');
    expect(html).toContain('bg-analysis-surface-alt');
    expect(html).toContain('rounded-[18px_18px_18px_4px]');
  });

  it('thread skeleton can show a pending context tag while discuss resolves', () => {
    const html = renderToStaticMarkup(
      createElement(CoachChatPanelSkeleton, { contextPending: true }),
    );
    expect(html).toContain('animate-pulse');
    expect(html).toContain('rounded-full');
  });
});
