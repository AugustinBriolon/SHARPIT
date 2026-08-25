import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CoachChatEmptyState } from '@/components/coach/chat/coach-chat-empty-state';
import { coachBeuiTheme } from '@/components/coach/beui/coach-beui-theme';

describe('CoachChatEmptyState', () => {
  it('uses the shared empty-state layout without duplicate header margins', () => {
    const html = renderToStaticMarkup(createElement(CoachChatEmptyState, { disabled: true }));
    expect(html).toContain(coachBeuiTheme.emptyState.split(' ')[0]);
    expect(html).toContain('Comment se présente ma forme');
    expect(html).not.toContain('mt-35');
    expect(html).not.toContain('mt-40');
  });
});
