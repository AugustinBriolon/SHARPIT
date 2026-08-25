import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CoachConversationList } from '@/components/coach/chat/coach-conversation-list';

const noop = () => undefined;

describe('CoachConversationList', () => {
  it('shows draft label on mobile while the desktop list skeletons', () => {
    const html = renderToStaticMarkup(
      createElement(CoachConversationList, {
        activeDraft: true,
        activeId: 'draft-1',
        conversations: [],
        loading: true,
        onDelete: noop,
        onSelect: noop,
      }),
    );

    expect(html).toContain('Nouvelle conversation');
    expect(html).toContain('hidden space-y-1 p-2 lg:block');
    expect(html).not.toContain('flex items-center gap-1.5 p-2 lg:hidden" aria-busy');
  });

  it('shows desktop list skeleton while loading even on a draft landing', () => {
    const html = renderToStaticMarkup(
      createElement(CoachConversationList, {
        activeDraft: true,
        activeId: 'draft-1',
        conversations: [],
        loading: true,
        onDelete: noop,
        onSelect: noop,
      }),
    );

    expect(html).toContain('Nouvelle conversation');
    expect(html).toContain('hidden space-y-1 p-2 lg:block');
    expect(html).toContain('animate-pulse');
  });

  it('skeletons the mobile picker only when restoring a saved thread', () => {
    const html = renderToStaticMarkup(
      createElement(CoachConversationList, {
        activeId: 'saved-1',
        conversations: [],
        loading: true,
        onDelete: noop,
        onSelect: noop,
      }),
    );

    expect(html).toContain('aria-busy');
    expect(html).not.toContain('Nouvelle conversation');
  });

  it('keeps draft label when other conversations exist on mobile', () => {
    const html = renderToStaticMarkup(
      createElement(CoachConversationList, {
        activeDraft: true,
        activeId: 'draft-1',
        conversations: [
          {
            id: 'saved-1',
            title: 'Footing du mardi',
            createdAt: new Date('2026-07-01'),
            updatedAt: new Date('2026-07-02'),
          },
        ],
        loading: false,
        onDelete: noop,
        onSelect: noop,
      }),
    );

    expect(html).toContain('Nouvelle conversation');
    expect(html).toContain('value="__draft__"');
  });
});
