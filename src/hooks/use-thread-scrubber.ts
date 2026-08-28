'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Dragging the load ruler to move where the thread is read from.
 *
 * The ruler was already a map of the season; this makes it the handle as well.
 * Nine weeks of shape, and the week under your thumb is the one the list below
 * anchors on — so seeing a dip in S32 and reading what happened that week is one
 * gesture rather than a date picker and a guess.
 *
 * One direction only, deliberately. The digest is a fixed handful of sessions
 * rather than a scrolling archive, so there is no scroll position for the ruler
 * to follow back: the ruler drives, the list follows.
 */
export function useThreadScrubber({
  count,
  activeIndex,
  onChange,
}: {
  count: number;
  activeIndex: number;
  onChange: (index: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const indexFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || count === 0) {
        return null;
      }
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) {
        return null;
      }
      const ratio = (clientX - rect.left) / rect.width;
      return Math.min(count - 1, Math.max(0, Math.floor(ratio * count)));
    },
    [count],
  );

  /* Coalesced to a frame: a pointermove can fire far faster than the list can
     re-partition, and re-rendering per event turns a smooth drag into a stutter. */
  const pending = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  const schedule = useCallback(
    (index: number) => {
      if (index === activeIndex) {
        return;
      }
      pending.current = index;
      if ((frame.current !== undefined && frame.current !== null)) {
        return;
      }
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        const next = pending.current;
        pending.current = null;
        if ((next !== undefined && next !== null)) {
          onChange(next);
        }
      });
    },
    [activeIndex, onChange],
  );

  useEffect(() => {
    return () => {
      if ((frame.current !== undefined && frame.current !== null)) {
        cancelAnimationFrame(frame.current);
      }
    };
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const index = indexFromClientX(event.clientX);
      if ((index === undefined || index === null)) {
        return;
      }
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      schedule(index);
    },
    [indexFromClientX, schedule],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) {
        return;
      }
      const index = indexFromClientX(event.clientX);
      if ((index !== undefined && index !== null)) {
        schedule(index);
      }
    },
    [dragging, indexFromClientX, schedule],
  );

  const stop = useCallback(() => setDragging(false), []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
      if (event.key === 'Home') {
        event.preventDefault();
        onChange(0);
        return;
      }
      if (event.key === 'End') {
        event.preventDefault();
        onChange(count - 1);
        return;
      }
      const delta = step[event.key];
      if (delta === undefined) {
        return;
      }
      event.preventDefault();
      onChange(Math.min(count - 1, Math.max(0, activeIndex + delta)));
    },
    [activeIndex, count, onChange],
  );

  return {
    trackRef,
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: stop,
      onPointerCancel: stop,
      onKeyDown,
    },
  };
}
