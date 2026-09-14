import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SystemEdgeBlur } from '@/components/layout/shell/system-edge-blur';

describe('SystemEdgeBlur', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollY', 0);
    vi.stubGlobal('addEventListener', vi.fn());
    vi.stubGlobal('removeEventListener', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a sticky sentinel without mounting glass at rest (SSR / scrollY 0)', () => {
    const html = renderToStaticMarkup(createElement(SystemEdgeBlur));
    expect(html).toContain('system-edge-blur');
    expect(html).not.toContain('system-edge-fade');
  });

  it('renders nothing when disabled', () => {
    const html = renderToStaticMarkup(createElement(SystemEdgeBlur, { enabled: false }));
    expect(html).toBe('');
  });
});
