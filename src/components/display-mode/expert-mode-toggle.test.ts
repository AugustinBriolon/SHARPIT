import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const useIsDemoMode = vi.fn(() => true);

vi.mock('@/hooks/use-is-demo-mode', () => ({
  useIsDemoMode: () => useIsDemoMode(),
}));

vi.mock('@/providers/display-mode-provider', () => ({
  useDisplayMode: () => ({
    mode: 'essential',
    isExpert: false,
    isResolved: true,
    setMode: () => {},
  }),
}));

import { ExpertModeToggle } from './expert-mode-toggle';

describe('ExpertModeToggle', () => {
  it('renders the density switch only in demo', () => {
    useIsDemoMode.mockReturnValue(true);
    const html = renderToStaticMarkup(createElement(ExpertModeToggle));

    expect(html).toContain('Densité d&#x27;affichage');
    expect(html).toContain('Essentiel');
    expect(html).toContain('Expert');
    expect(html).toContain('aria-pressed="true"');
  });

  it('renders nothing for real athletes', () => {
    useIsDemoMode.mockReturnValue(false);
    const html = renderToStaticMarkup(createElement(ExpertModeToggle));
    expect(html).toBe('');
  });
});
