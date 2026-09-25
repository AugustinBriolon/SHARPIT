import { describe, expect, it, vi } from 'vitest';
import {
  FOCUS_ZOOM_LOCKED_CONTENT,
  createIosIframeFocusZoomController,
  isKeyboardLikelyOpen,
  lockIosIframeFocusZoom,
  parseViewportContent,
  unlockIosIframeFocusZoom,
  withFocusZoomLock,
  withoutFocusZoomLock,
} from '@/lib/integrations/garmin/ios-iframe-focus-zoom';

describe('ios-iframe-focus-zoom viewport content', () => {
  it('locks maximum-scale without changing the base pinch-friendly content', () => {
    const base = 'width=device-width, initial-scale=1, viewport-fit=cover';
    expect(withFocusZoomLock(base)).toBe(FOCUS_ZOOM_LOCKED_CONTENT);
    expect(parseViewportContent(withFocusZoomLock(base)).maximumScale).toBe('1');
  });

  it('restores a previous content that had no maximum-scale lock', () => {
    const original = 'width=device-width, initial-scale=1, viewport-fit=cover';
    expect(withoutFocusZoomLock(FOCUS_ZOOM_LOCKED_CONTENT, original)).toBe(original);
  });

  it('falls back to a pinch-zoomable default when original is missing', () => {
    expect(withoutFocusZoomLock(FOCUS_ZOOM_LOCKED_CONTENT, null)).toBe(
      'width=device-width, initial-scale=1, viewport-fit=cover',
    );
  });

  it('treats a shrunk visual viewport as keyboard-open', () => {
    expect(isKeyboardLikelyOpen({ layoutHeight: 844, visualHeight: 480 })).toBe(true);
    expect(isKeyboardLikelyOpen({ layoutHeight: 844, visualHeight: 820 })).toBe(false);
  });
});

describe('lockIosIframeFocusZoom / unlockIosIframeFocusZoom', () => {
  it('writes maximum-scale=1 then restores the original meta content', () => {
    let metaContent = 'width=device-width, initial-scale=1, viewport-fit=cover';
    const meta = {
      getAttribute: (name: string) => {
        if (name === 'content') {
          return metaContent;
        }
        if (name === 'name') {
          return 'viewport';
        }
        return null;
      },
      setAttribute: (name: string, value: string) => {
        if (name === 'content') {
          metaContent = value;
        }
      },
      dataset: {} as Record<string, string>,
    };
    const doc = {
      querySelector: (selector: string) => (selector === 'meta[name="viewport"]' ? meta : null),
    } as unknown as Document;

    lockIosIframeFocusZoom(doc);
    expect(metaContent).toBe(FOCUS_ZOOM_LOCKED_CONTENT);

    unlockIosIframeFocusZoom(doc);
    expect(metaContent).toBe('width=device-width, initial-scale=1, viewport-fit=cover');
  });
});

describe('createIosIframeFocusZoomController', () => {
  it('locks on single-finger iframe pointerdown and unlocks when the keyboard closes', () => {
    const lock = vi.fn();
    const unlock = vi.fn();
    let visualHeight = 844;
    const controller = createIosIframeFocusZoomController({
      getLayoutHeight: () => 844,
      getVisualHeight: () => visualHeight,
      lock,
      unlock,
    });

    controller.onIframePointerDown({ type: 'touchstart', touches: { length: 1 } as TouchList });
    expect(lock).toHaveBeenCalledOnce();

    visualHeight = 480;
    controller.onVisualViewportChange();
    expect(unlock).not.toHaveBeenCalled();

    visualHeight = 844;
    controller.onVisualViewportChange();
    expect(unlock).toHaveBeenCalledOnce();
  });

  it('unlocks immediately on a two-finger pinch so deliberate zoom is not blocked', () => {
    const lock = vi.fn();
    const unlock = vi.fn();
    const controller = createIosIframeFocusZoomController({
      getLayoutHeight: () => 844,
      getVisualHeight: () => 844,
      lock,
      unlock,
    });

    controller.onIframePointerDown({ type: 'touchstart', touches: { length: 1 } as TouchList });
    controller.onDocumentTouchStart({ touches: { length: 2 } as TouchList });
    expect(unlock).toHaveBeenCalledOnce();
  });

  it('restores on dispose', () => {
    const unlock = vi.fn();
    const controller = createIosIframeFocusZoomController({
      getLayoutHeight: () => 844,
      getVisualHeight: () => 844,
      lock: vi.fn(),
      unlock,
    });
    controller.onIframePointerDown({ type: 'pointerdown' });
    controller.dispose();
    expect(unlock).toHaveBeenCalledOnce();
  });
});
