'use client';

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { useReducedMotion } from 'motion/react';

/** Loads the next window before the athlete actually hits the oldest day. */
const LOAD_AHEAD_MARGIN_PX = 320;

/**
 * Prepending days would shove the visible ones right — shift scrollLeft by the
 * width that was added so the athlete keeps looking at the same days.
 */
function useKeepPositionOnPrepend(containerRef: RefObject<HTMLElement | null>, firstKey: string) {
  const previous = useRef<{ firstKey: string; scrollWidth: number } | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    if (previous.current && previous.current.firstKey !== firstKey) {
      container.scrollLeft += container.scrollWidth - previous.current.scrollWidth;
    }
    previous.current = { firstKey, scrollWidth: container.scrollWidth };
  }, [containerRef, firstKey]);
}

function selectedDayElement(container: HTMLElement, selectedKey: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[data-day-key="${selectedKey}"]`);
}

function scrollDayToCenter(container: HTMLElement, day: HTMLElement, behavior: ScrollBehavior) {
  const left = day.offsetLeft - (container.clientWidth - day.offsetWidth) / 2;
  container.scrollTo({ left, behavior });
}

/** Centers the selected day; keeps keyboard focus on it when focus was already in the strip. */
function useCenterSelectedDay(containerRef: RefObject<HTMLElement | null>, selectedKey: string) {
  const reduceMotion = useReducedMotion();
  const hasCentered = useRef(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const selected = container ? selectedDayElement(container, selectedKey) : null;
    if (!container || !selected) {
      return;
    }
    scrollDayToCenter(
      container,
      selected,
      hasCentered.current && !reduceMotion ? 'smooth' : 'auto',
    );
    hasCentered.current = true;
    if (container.contains(document.activeElement)) {
      selected.focus({ preventScroll: true });
    }
  }, [containerRef, reduceMotion, selectedKey]);

  // Next keeps visited routes mounted under `display: none`, so the strip can lay out
  // at width 0 and the centering above is lost. The observer's first callback (and a
  // rotation) re-centers once the strip has a real width.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    let lastWidth = -1;
    const observer = new ResizeObserver(() => {
      const selected = selectedDayElement(container, selectedKey);
      if (container.clientWidth !== lastWidth && selected) {
        scrollDayToCenter(container, selected, 'auto');
      }
      lastWidth = container.clientWidth;
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, selectedKey]);
}

function useLoadMoreAtStart(
  containerRef: RefObject<HTMLElement | null>,
  sentinelRef: RefObject<HTMLElement | null>,
  { firstKey, onReachStart }: { firstKey: string; onReachStart: (() => void) | null },
) {
  const latestOnReachStart = useRef(onReachStart);
  useLayoutEffect(() => {
    latestOnReachStart.current = onReachStart;
  }, [onReachStart]);
  const canLoadMore = onReachStart !== null;

  // Re-observing on every new first day re-fires while the sentinel is still visible,
  // so a wide viewport keeps loading until the strip actually overflows.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!canLoadMore || !sentinel) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          latestOnReachStart.current?.();
        }
      },
      { root: containerRef.current, rootMargin: `0px 0px 0px ${LOAD_AHEAD_MARGIN_PX}px` },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [canLoadMore, containerRef, firstKey, sentinelRef]);
}

export function useDateStripScroll({
  firstKey,
  selectedKey,
  onReachStart,
}: {
  firstKey: string;
  selectedKey: string;
  /** Null once the oldest allowed day is rendered. */
  onReachStart: (() => void) | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLSpanElement>(null);

  useKeepPositionOnPrepend(containerRef, firstKey);
  useCenterSelectedDay(containerRef, selectedKey);
  useLoadMoreAtStart(containerRef, sentinelRef, { firstKey, onReachStart });

  return { containerRef, sentinelRef };
}
