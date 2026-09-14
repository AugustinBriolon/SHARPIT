import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SystemEdgeBlur } from '@/components/layout/shell/system-edge-blur';

describe('SystemEdgeBlur', () => {
  it('is a no-op — overlay removed from AppShell (ADR-039)', () => {
    expect(renderToStaticMarkup(createElement(SystemEdgeBlur))).toBe('');
    expect(renderToStaticMarkup(createElement(SystemEdgeBlur, { enabled: true }))).toBe('');
  });
});
