/**
 * Temporary iOS Safari focus-zoom guard for the cross-origin Garmin SSO iframe.
 *
 * iOS zooms when focused inputs (incl. inside iframes) have computed font-size < 16px.
 * We cannot restyle Garmin's inputs. Locking maximum-scale permanently also blocks
 * intentional pinch-zoom — so we only set maximum-scale=1 while the athlete is
 * interacting with the iframe / the soft keyboard is open, then restore.
 */

export const PINCH_ZOOMABLE_VIEWPORT = 'width=device-width, initial-scale=1, viewport-fit=cover';

export const FOCUS_ZOOM_LOCKED_CONTENT =
  'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover';

/** Soft keyboard usually shrinks the visual viewport by more than this. */
const KEYBOARD_HEIGHT_DELTA_PX = 120;

export function parseViewportContent(content: string): {
  width?: string;
  initialScale?: string;
  maximumScale?: string;
  viewportFit?: string;
} {
  const parts = Object.fromEntries(
    content
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [key, ...rest] = part.split('=');
        return [key.trim(), rest.join('=').trim()] as const;
      }),
  );
  return {
    width: parts['width'],
    initialScale: parts['initial-scale'],
    maximumScale: parts['maximum-scale'],
    viewportFit: parts['viewport-fit'],
  };
}

export function withFocusZoomLock(_currentContent: string): string {
  return FOCUS_ZOOM_LOCKED_CONTENT;
}

export function withoutFocusZoomLock(
  _lockedContent: string,
  originalContent: string | null | undefined,
): string {
  if (originalContent && originalContent.trim().length > 0) {
    return originalContent;
  }
  return PINCH_ZOOMABLE_VIEWPORT;
}

export function isKeyboardLikelyOpen(sizes: {
  layoutHeight: number;
  visualHeight: number;
}): boolean {
  return sizes.layoutHeight - sizes.visualHeight > KEYBOARD_HEIGHT_DELTA_PX;
}

export function readViewportMeta(doc: Document = document): HTMLMetaElement | null {
  return doc.querySelector('meta[name="viewport"]');
}

/**
 * Apply maximum-scale=1 for the duration of iframe focus / soft keyboard.
 * Stores the previous content once so unlock can restore pinch-zoom.
 */
export function lockIosIframeFocusZoom(doc: Document = document): void {
  const meta = readViewportMeta(doc);
  if (!meta) {
    return;
  }
  if (meta.dataset.iosFocusZoomOriginal === undefined) {
    meta.dataset.iosFocusZoomOriginal = meta.getAttribute('content') ?? '';
  }
  meta.setAttribute('content', withFocusZoomLock(meta.getAttribute('content') ?? ''));
}

/** Restore the pre-lock viewport so pinch-zoom works again. */
export function unlockIosIframeFocusZoom(doc: Document = document): void {
  const meta = readViewportMeta(doc);
  if (!meta || meta.dataset.iosFocusZoomOriginal === undefined) {
    return;
  }
  const original = meta.dataset.iosFocusZoomOriginal;
  meta.setAttribute('content', withoutFocusZoomLock(meta.getAttribute('content') ?? '', original));
  delete meta.dataset.iosFocusZoomOriginal;
}

export type IosIframeFocusZoomController = {
  /** Call on single-finger pointerdown / touchstart / focus over the SSO iframe. */
  onIframePointerDown: (
    event: Pick<TouchEvent | PointerEvent, 'type'> & {
      touches?: TouchList;
    },
  ) => void;
  /** Call when a multi-touch (pinch) starts anywhere — do not fight deliberate zoom. */
  onDocumentTouchStart: (event: Pick<TouchEvent, 'touches'>) => void;
  /** Call on visualViewport resize / scroll / window focus. */
  onVisualViewportChange: () => void;
  /** Always restore on teardown. */
  dispose: () => void;
};

/**
 * Wire temporary focus-zoom lock around a Garmin SSO iframe interaction.
 * Pure controller — attach DOM listeners via {@link attachIosIframeFocusZoomGuard}.
 */
export function createIosIframeFocusZoomController(
  options: {
    getLayoutHeight: () => number;
    getVisualHeight: () => number;
    lock?: () => void;
    unlock?: () => void;
  } = {
    getLayoutHeight: () => window.innerHeight,
    getVisualHeight: () => window.visualViewport?.height ?? window.innerHeight,
  },
): IosIframeFocusZoomController {
  const lock = options.lock ?? (() => lockIosIframeFocusZoom());
  const unlock = options.unlock ?? (() => unlockIosIframeFocusZoom());
  let locked = false;

  function applyLock() {
    if (!locked) {
      lock();
      locked = true;
    }
  }

  function applyUnlock() {
    if (locked) {
      unlock();
      locked = false;
    }
  }

  return {
    onIframePointerDown(event) {
      if (event.touches && event.touches.length >= 2) {
        applyUnlock();
        return;
      }
      applyLock();
    },
    onDocumentTouchStart(event) {
      if (event.touches.length >= 2) {
        applyUnlock();
      }
    },
    onVisualViewportChange() {
      if (
        !isKeyboardLikelyOpen({
          layoutHeight: options.getLayoutHeight(),
          visualHeight: options.getVisualHeight(),
        })
      ) {
        applyUnlock();
      }
    },
    dispose: applyUnlock,
  };
}

/** Bind DOM listeners; returns an disposer that also unlocks. */
export function attachIosIframeFocusZoomGuard(
  iframe: HTMLIFrameElement,
  controller: IosIframeFocusZoomController = createIosIframeFocusZoomController(),
): () => void {
  function lockIfIframeFocused() {
    if (document.activeElement === iframe) {
      controller.onIframePointerDown({ type: 'focus' });
    }
  }

  function onIframeActivate(event: Event) {
    if (event.type === 'touchstart' && 'touches' in event) {
      controller.onIframePointerDown(event as TouchEvent);
      return;
    }
    controller.onIframePointerDown({ type: event.type });
  }

  function onWindowBlur() {
    // Focus moved into the cross-origin iframe — lock before iOS focus-zooms.
    window.setTimeout(lockIfIframeFocused, 0);
  }

  function onWindowFocus() {
    controller.onVisualViewportChange();
  }

  function onDocumentTouchStart(event: TouchEvent) {
    controller.onDocumentTouchStart(event);
  }

  function onVisualViewportChange() {
    controller.onVisualViewportChange();
  }

  iframe.addEventListener('pointerdown', onIframeActivate);
  iframe.addEventListener('touchstart', onIframeActivate, { passive: true });
  iframe.addEventListener('focus', onIframeActivate);
  window.addEventListener('blur', onWindowBlur);
  window.addEventListener('focus', onWindowFocus);
  document.addEventListener('touchstart', onDocumentTouchStart, {
    passive: true,
    capture: true,
  });
  window.visualViewport?.addEventListener('resize', onVisualViewportChange);
  window.visualViewport?.addEventListener('scroll', onVisualViewportChange);

  return () => {
    iframe.removeEventListener('pointerdown', onIframeActivate);
    iframe.removeEventListener('touchstart', onIframeActivate);
    iframe.removeEventListener('focus', onIframeActivate);
    window.removeEventListener('blur', onWindowBlur);
    window.removeEventListener('focus', onWindowFocus);
    document.removeEventListener('touchstart', onDocumentTouchStart, true);
    window.visualViewport?.removeEventListener('resize', onVisualViewportChange);
    window.visualViewport?.removeEventListener('scroll', onVisualViewportChange);
    controller.dispose();
  };
}
