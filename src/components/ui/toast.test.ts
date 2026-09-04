import { describe, expect, it } from 'vitest';

import { toastCloseClass, toastViewportClass } from '@/components/ui/toast';

describe('toastViewportClass', () => {
  it('anchors above the mobile bottom nav so toasts never cover a nav tap', () => {
    expect(toastViewportClass).toContain('bottom-[calc(var(--bottom-nav-offset)+0.75rem)]');
    expect(toastViewportClass).not.toContain('bottom-4');
  });

  it('keeps the nav offset on every viewport — the tab bar is no longer lg:hidden', () => {
    expect(toastViewportClass).not.toContain('lg:bottom-6');
    expect(toastViewportClass).not.toContain('sm:bottom-');
  });

  it('keeps the full-width band inert so it cannot swallow taps', () => {
    expect(toastViewportClass).toContain('pointer-events-none');
  });
});

describe('toastCloseClass', () => {
  it('keeps the close target touch-first on mobile and dense on desktop', () => {
    expect(toastCloseClass).toContain('size-9');
    expect(toastCloseClass).toContain('lg:size-7');
  });
});
