import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CoachConversationList } from '@/components/coach/chat/coach-conversation-list';

const noop = () => undefined;

describe('CoachConversationList', () => {
  it('shows new-conversation when handler is provided', () => {
    const html = renderToStaticMarkup(
      createElement(CoachConversationList, {
        activeDraft: true,
        activeId: 'draft-1',
        conversations: [],
        loading: true,
        onDelete: noop,
        onNewConversation: noop,
        onSelect: noop,
      }),
    );

    expect(html).toContain('Nouvelle conversation');
    expect(html).toContain('aria-busy');
    expect(html).toContain('animate-pulse');
  });

  it('omits new-conversation when no handler is provided', () => {
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

  it('sheet variant drops the nested analysis panel', () => {
    const html = renderToStaticMarkup(
      createElement(CoachConversationList, {
        activeId: 'saved-1',
        conversations: [
          {
            id: 'saved-1',
            title: 'Footing du mardi',
            createdAt: new Date('2026-07-01'),
            updatedAt: new Date('2026-07-02'),
          },
        ],
        loading: false,
        variant: 'sheet',
        onDelete: noop,
        onNewConversation: noop,
        onSelect: noop,
      }),
    );

    expect(html).toContain('Footing du mardi');
    expect(html).toContain('Nouvelle conversation');
    expect(html).not.toContain('analysis-panel');
  });

  it('lists conversations when idle', () => {
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
        onNewConversation: noop,
        onSelect: noop,
      }),
    );

    expect(html).toContain('Nouvelle conversation');
    expect(html).toContain('Footing du mardi');
  });
});
