import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const APP_SHELL = fs.readFileSync(
  path.join(process.cwd(), 'src/components/layout/shell/app-shell.tsx'),
  'utf8',
);

const SYSTEM_EDGE_BLUR = fs.readFileSync(
  path.join(process.cwd(), 'src/components/layout/shell/system-edge-blur.tsx'),
  'utf8',
);

const GLOBALS = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');

const ROOT_LAYOUT = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8');

const MOBILE_BACK = fs.readFileSync(
  path.join(process.cwd(), 'src/components/layout/header/mobile-back-link.tsx'),
  'utf8',
);

const COACH_LAYOUT = fs.readFileSync(
  path.join(process.cwd(), 'src/components/coach/view/coach-view-layout.tsx'),
  'utf8',
);

const ADR_039 = fs.readFileSync(
  path.join(process.cwd(), 'docs/adr/ADR-039-ios-system-edge-fade.md'),
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

  it('does not mask <main> with scroll-fade (that erases pixels under the island)', () => {
    const withoutComments = APP_SHELL.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(withoutComments).not.toMatch(/\bscroll-fade\b/);
  });

  it('uses document scroll and safe-page-top so headings clear the status strip', () => {
    expect(APP_SHELL).toContain('min-h-dvh');
    expect(APP_SHELL).not.toContain('h-dvh flex-col overflow-hidden');
    expect(APP_SHELL).toContain('overflow-x-clip');
    expect(APP_SHELL).not.toContain('overflow-y-auto');
    expect(APP_SHELL).toContain('safe-page-top');
    expect(APP_SHELL).toContain('<SystemEdgeBlur enabled={!coachMobileImmersive} />');
    const mainIdx = APP_SHELL.indexOf('<main');
    const blurIdx = APP_SHELL.indexOf('<SystemEdgeBlur');
    expect(mainIdx).toBeGreaterThan(-1);
    expect(blurIdx).toBeGreaterThan(mainIdx);
  });

  it('observes the document viewport for desktop sticky headers', () => {
    const stickyHook = fs.readFileSync(
      path.join(process.cwd(), 'src/components/layout/header/use-desktop-sticky-header.ts'),
      'utf8',
    );
    expect(stickyHook).toContain('root: null');
    expect(stickyHook).not.toContain("el.closest('main')");
  });

  it('anchors SyncingIndicator under the top safe area, not at raw top-0', () => {
    expect(APP_SHELL).toContain('safe-top-offset');
    expect(APP_SHELL).not.toContain('fixed top-0 left-0 z-50');
  });
});

describe('iOS immersive viewport contract', () => {
  it('uses black-translucent status bar so content can paint under the island', () => {
    expect(ROOT_LAYOUT).toContain("statusBarStyle: 'black-translucent'");
    expect(ROOT_LAYOUT).toContain("viewportFit: 'cover'");
  });

  it('defines safe-page-top with a Safari-tab floor when env() under-reports', () => {
    expect(GLOBALS).toContain('--safe-top: env(safe-area-inset-top, 0px)');
    expect(GLOBALS).toContain('--safe-page-top-floor: 3.5rem');
    expect(GLOBALS).toContain('@utility safe-page-top');
    expect(GLOBALS).toContain(
      'padding-top: max(var(--safe-page-top-floor), env(safe-area-inset-top, 0px))',
    );
    expect(GLOBALS).toContain('@utility system-edge-blur');
    expect(GLOBALS).toContain('@utility system-edge-fade');
    expect(GLOBALS).not.toMatch(/--safe-page-top-floor:\s*\d+px/);
  });

  it('keeps transparent blur on the absolute fade child and gates it on scroll', () => {
    expect(SYSTEM_EDGE_BLUR).toContain('system-edge-fade');
    expect(SYSTEM_EDGE_BLUR).toContain('scrollY > 4');
    expect(SYSTEM_EDGE_BLUR).toContain('{scrolled ? <div className="system-edge-fade" /> : null}');
    expect(SYSTEM_EDGE_BLUR).not.toContain('opacity-0');
    const blurBlock = GLOBALS.slice(GLOBALS.indexOf('@utility system-edge-blur {'));
    const sentinel = blurBlock.slice(0, blurBlock.indexOf('@utility system-edge-fade'));
    const fade = blurBlock.slice(blurBlock.indexOf('@utility system-edge-fade'));
    expect(sentinel).not.toContain('backdrop-filter');
    expect(sentinel).not.toContain('background-color');
    expect(fade).toContain('position: absolute');
    expect(fade).toContain('backdrop-filter');
    expect(fade).toContain('color-mix(in oklab, var(--background) 12%, transparent)');
  });

  it('places the floating back control with safe-top-offset', () => {
    expect(MOBILE_BACK).toContain('safe-top-offset');
    expect(MOBILE_BACK).not.toContain('fixed top-3 left-');
  });

  it('does not pad the Coach immersive frame with opaque safe-area-top', () => {
    expect(COACH_LAYOUT).toContain('bg-background fixed inset-x-0 top-0');
    expect(COACH_LAYOUT).not.toContain('safe-area-top fixed');
  });

  it('documents safe content + scroll-only blur in ADR-039', () => {
    expect(ADR_039).toContain('safe-page-top');
    expect(ADR_039).toContain('--safe-page-top-floor: 3.5rem');
    expect(ADR_039).toContain('scrollY > 4');
    expect(ADR_039).not.toContain('colour-matched scrim');
  });
});
