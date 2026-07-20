import { describe, expect, it } from 'vitest';

import { PAGE_GUTTER } from './page-gutter';

describe('PAGE_GUTTER (shell bleed contract)', () => {
  it('matches MobileShell --page-gutter (px-4)', () => {
    expect(PAGE_GUTTER.mobile).toBe('1rem');
  });

  it('matches DesktopShell --page-gutter (p-6)', () => {
    expect(PAGE_GUTTER.desktop).toBe('1.5rem');
  });
});
