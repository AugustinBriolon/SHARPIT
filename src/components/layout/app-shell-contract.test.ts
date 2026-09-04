import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const APP_SHELL = fs.readFileSync(
  path.join(process.cwd(), 'src/components/layout/app-shell.tsx'),
  'utf8',
);

describe('AppShell chrome contract', () => {
  it('does not mount a desktop sidebar', () => {
    expect(APP_SHELL).not.toMatch(/from ['"]\.\/sidebar['"]/);
    expect(APP_SHELL).not.toContain('<Sidebar');
  });

  it('mounts the floating bottom nav on every viewport', () => {
    expect(APP_SHELL).toContain('<BottomNav');
    expect(APP_SHELL).not.toMatch(/lg:hidden[\s\S]*<BottomNav/);
  });

  it('centers a max-w-3xl reading column instead of a full-bleed desktop pane', () => {
    expect(APP_SHELL).toContain('PAGE_CONTENT_MAX_CLASS');
    expect(APP_SHELL).not.toContain('lg:max-w-none');
  });

  it('reserves bottom-nav offset on every viewport', () => {
    expect(APP_SHELL).toContain('pb-(--bottom-nav-offset)');
    expect(APP_SHELL).not.toContain('max-lg:pb-');
  });
});
