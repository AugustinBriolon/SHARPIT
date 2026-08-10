import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SessionsHubSkeleton } from '@/components/sessions/sessions-hub';

describe('sessions hub skeleton', () => {
  it('renders real chrome, calendrier tab, and calendar grid pulses', () => {
    const html = renderToStaticMarkup(createElement(SessionsHubSkeleton));
    expect(html).toContain('Entraînement');
    expect(html).toContain('Historique &amp; planning');
    expect(html).toContain('Calendrier');
    expect(html).toContain('Activités');
    expect(html).toContain('Planning');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('grid-cols-7');
    expect(html).toContain('min-h-20');
    expect(html).toContain('rounded-analysis');
  });
});
