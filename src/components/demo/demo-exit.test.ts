import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEMO_EXIT_HREF, DemoExitButton, DemoExitTextLink } from '@/components/demo/demo-exit';

describe('DEMO_EXIT_HREF', () => {
  it('points at the cookie-clearing exit route that redirects to sign-in', () => {
    expect(DEMO_EXIT_HREF).toBe('/api/demo/exit');
  });
});

describe('DemoExitTextLink', () => {
  it('renders a link to the exit route with the expected label', () => {
    const html = renderToStaticMarkup(createElement(DemoExitTextLink));
    expect(html).toContain(`href="${DEMO_EXIT_HREF}"`);
    expect(html).toContain('Quitter la démo');
  });

  it('forwards a custom className', () => {
    const html = renderToStaticMarkup(createElement(DemoExitTextLink, { className: 'mt-2' }));
    expect(html).toContain('mt-2');
  });
});

describe('DemoExitButton', () => {
  it('renders as a link to the exit route with the expected label', () => {
    const html = renderToStaticMarkup(createElement(DemoExitButton));
    expect(html).toContain(`href="${DEMO_EXIT_HREF}"`);
    expect(html).toContain('Quitter la démo');
  });
});
