'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Swipe a row aside to reveal the actions behind it.
 *
 * The row follows the finger rather than jumping open at a threshold: a panel
 * that appears fully formed gives no sense of how far is far enough, so the first
 * attempt is always a guess. Here the reveal is proportional, and letting go
 * snaps to whichever end is nearer.
 *
 * Horizontal intent has to be earned. Until the pointer has moved further across
 * than down, nothing is captured and the page scrolls normally — the alternative
 * is a list that fights every attempt to scroll past it.
 */

/** Past this fraction of the panel, releasing opens rather than closes. */
const SNAP_FRACTION = 0.4;
/** Movement below this is a tap with a shaky thumb, not a swipe. */
const INTENT_PX = 6;

export function useSwipeReveal(panelWidth: number) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const start = useRef<{ x: number; y: number; base: number } | null>(null);
  const captured = useRef(false);

  const close = useCallback(() => {
    setOffset(0);
    setDragging(false);
    start.current = null;
    captured.current = false;
  }, []);

  /* Scrolling away from an open row should put it back: leaving panels open
     behind you turns the list into a trail of half-finished gestures.
     
     But only a scroll that actually moves. Focusing the row makes the browser
     emit a scroll event at the same position, which closed the panel in the same
     tick it opened — the gesture appeared to do nothing at all. */
  useEffect(() => {
    if (offset === 0) {
      return;
    }

    const anchor = new Map<EventTarget, number>();
    const onScroll = (event: Event) => {
      const { target } = event;
      if (!target) {
        return;
      }
      const top =
        target === document
          ? window.scrollY
          : ((target as HTMLElement).scrollTop ?? window.scrollY);
      const previous = anchor.get(target);
      if (previous === undefined) {
        anchor.set(target, top);
        return;
      }
      if (Math.abs(top - previous) > 2) {
        close();
      }
    };

    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', onScroll, { capture: true });
  }, [offset, close]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType === 'mouse') {
        return;
      }
      start.current = { x: event.clientX, y: event.clientY, base: offset };
      captured.current = false;
    },
    [offset],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const origin = start.current;
      if (!origin) {
        return;
      }

      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;

      if (!captured.current) {
        // Vertical wins ties: scrolling is the more common intent by far.
        if (Math.abs(dx) < INTENT_PX || Math.abs(dx) <= Math.abs(dy)) {
          return;
        }
        captured.current = true;
        setDragging(true);
      }

      const next = Math.min(0, Math.max(-panelWidth, origin.base + dx));
      setOffset(next);
    },
    [panelWidth],
  );

  const onPointerUp = useCallback(() => {
    if (!captured.current) {
      start.current = null;
      return;
    }
    setDragging(false);
    setOffset((current) => (current < -panelWidth * SNAP_FRACTION ? -panelWidth : 0));
    start.current = null;
    captured.current = false;
  }, [panelWidth]);

  return {
    offset,
    /** True while the finger is down and moving — used to drop the transition. */
    dragging,
    isOpen: offset !== 0,
    close,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
    /** A swipe that opened the panel must not also fire the row's own tap. */
    swallowClick: (event: React.MouseEvent) => {
      if (offset === 0) {
        return false;
      }
      event.preventDefault();
      event.stopPropagation();
      close();
      return true;
    },
  };
}
