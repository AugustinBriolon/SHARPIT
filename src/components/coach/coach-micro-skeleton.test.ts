import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  CoachChatPanelSkeleton,
  CoachConversationListSkeleton,
  CoachHubSkeleton,
} from '@/components/coach/coach-hub-skeleton';

describe('coach hub micro-skeleton', () => {
  it('renders mobile fixed shell and desktop sticky hub', () => {
    const html = renderToStaticMarkup(createElement(CoachHubSkeleton));
    expect(html).toContain('lg:hidden');
    expect(html).toContain('hidden space-y-6 lg:block');
    expect(html).toContain('Fil &amp; conversations');
    expect(html).toContain('Mon profil');
    expect(html).toContain('lg:sticky');
  });

  it('renders conversation row placeholders without Chargement text', () => {
    const html = renderToStaticMarkup(createElement(CoachConversationListSkeleton));
    expect(html).not.toContain('Chargement');
    expect(html).toContain('aria-busy');
  });

  it('empty variant keeps composer chrome without thread bubbles', () => {
    const empty = renderToStaticMarkup(createElement(CoachChatPanelSkeleton, { variant: 'empty' }));
    expect(empty).toContain('aria-busy');
    expect(empty).toContain('border-t');
    expect(empty).toContain('rounded-full');
  });

  it('thread variant shows message bubble placeholders', () => {
    const thread = renderToStaticMarkup(
      createElement(CoachChatPanelSkeleton, { variant: 'thread' }),
    );
    expect(thread).toContain('analysis-panel-alt');
  });
});
