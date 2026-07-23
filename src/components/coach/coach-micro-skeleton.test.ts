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
    expect(html).toContain('Mon profil');
    expect(html).toContain('Pose une question à ton coach');
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

  it('empty chrome uses real copy and composer, not suggestion skeletons', () => {
    const html = renderToStaticMarkup(createElement(CoachChatEmptyChrome));
    expect(html).toContain('Demande conseil à ton coach');
    expect(html).toContain('Comment se présente ma forme');
    expect(html).not.toContain('aria-busy');
  });

  it('thread skeleton keeps real composer chrome and coach bubble surface', () => {
    const html = renderToStaticMarkup(createElement(CoachChatPanelSkeleton));
    expect(html).toContain('aria-busy');
    expect(html).toContain('Demande conseil à ton coach');
    expect(html).toContain('bg-analysis-surface-alt');
    expect(html).toContain('rounded-[18px_18px_18px_4px]');
  });
});
