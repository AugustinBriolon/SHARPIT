import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const APP_SHELL = fs.readFileSync(
  path.join(process.cwd(), 'src/components/layout/shell/app-shell.tsx'),
  'utf8',
);

describe('AppShell chrome contract', () => {
  it('does not mount a desktop sidebar', () => {
    expect(APP_SHELL).not.toMatch(/from ['"]\.\/sidebar['"]/);
    expect(APP_SHELL).not.toContain('<Sidebar');
  });

  it('hides the floating bottom nav only for coach on mobile', () => {
    expect(APP_SHELL).toContain('<BottomNav');
    expect(APP_SHELL).toContain('coachMobileImmersive');
    expect(APP_SHELL).toContain('hideBottomNav');
    expect(APP_SHELL).toContain('{hideBottomNav ? null : <BottomNav />}');
  });

  it('centers a max-w-3xl reading column instead of a full-bleed desktop pane', () => {
    expect(APP_SHELL).toContain('PAGE_CONTENT_MAX_CLASS');
    expect(APP_SHELL).not.toContain('lg:max-w-none');
  });

  it('reserves bottom-nav offset except on coach mobile immersive', () => {
    expect(APP_SHELL).toContain('pb-(--bottom-nav-offset)');
    expect(APP_SHELL).toContain("hideBottomNav ? 'pb-0'");
  });
});
