import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signOut = vi.fn();
vi.mock('@clerk/nextjs', () => ({ useClerk: () => ({ signOut }) }));

describe('demo exit', () => {
  beforeEach(() => {
    signOut.mockReset();
  });

  it('renders buttons, not a cookie-clearing link', async () => {
    const { DemoExitButton, DemoExitTextLink } = await import('./demo-exit');
    for (const component of [DemoExitButton, DemoExitTextLink]) {
      const html = renderToStaticMarkup(createElement(component));
      expect(html).toContain('Quitter la démo');
      expect(html).not.toContain('href=');
    }
  });

  it('keeps a caller class on the text link', async () => {
    const { DemoExitTextLink } = await import('./demo-exit');
    const html = renderToStaticMarkup(createElement(DemoExitTextLink, { className: 'mt-2' }));
    expect(html).toContain('mt-2');
  });

  it('leaves the demo by signing out to the sign-in page', async () => {
    const { DEMO_EXIT_REDIRECT } = await import('./demo-exit');
    expect(DEMO_EXIT_REDIRECT).toBe('/sign-in');
  });
});
