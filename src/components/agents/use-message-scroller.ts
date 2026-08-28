import { type Ref, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PreviewRailItem } from '@/components/motion/preview-rail';
import {
  buildRailItems,
  railItemsUnchanged,
  resolveActiveRailId,
  scrollBehaviorFor,
  scrollElementTo,
  scrollToRailTarget,
} from '@/components/agents/message-scroller-helpers';

type UseMessageScrollerRailOptions = {
  navigation: 'rail' | undefined;
  followThreshold: number;
  followOutput: boolean;
  reduce: boolean;
  smooth: boolean;
  onFollowChange?: (following: boolean) => void;
  externalViewportRef?: Ref<HTMLElement>;
};

function clearMessageScrollerTimers(refs: {
  scrollTimerRef: { current: number | undefined };
  frameRef: { current: number | undefined };
  scrollFrameRef: { current: number | undefined };
  railFrameRef: { current: number | undefined };
}) {
  if (refs.scrollTimerRef.current) {
    window.clearTimeout(refs.scrollTimerRef.current);
  }
  if (refs.frameRef.current) {
    cancelAnimationFrame(refs.frameRef.current);
  }
  if (refs.scrollFrameRef.current) {
    cancelAnimationFrame(refs.scrollFrameRef.current);
  }
  if (refs.railFrameRef.current) {
    cancelAnimationFrame(refs.railFrameRef.current);
  }
}

function clearRailNavigationState(
  railTargetsRef: React.MutableRefObject<Map<string, HTMLElement>>,
  setRailItems: React.Dispatch<React.SetStateAction<PreviewRailItem[]>>,
  setRailOverflowing: React.Dispatch<React.SetStateAction<boolean>>,
) {
  railTargetsRef.current.clear();
  setRailItems([]);
  setRailOverflowing(false);
}

function attachRailObservers(
  content: HTMLDivElement,
  viewport: HTMLElement,
  scheduleRailSync: () => void,
) {
  scheduleRailSync();
  const mutationObserver =
    typeof MutationObserver === 'undefined' ? null : new MutationObserver(scheduleRailSync);
  mutationObserver?.observe(content, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  const resizeObserver =
    typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleRailSync);
  resizeObserver?.observe(content);
  resizeObserver?.observe(viewport);

  return () => {
    mutationObserver?.disconnect();
    resizeObserver?.disconnect();
  };
}

function setupRailNavigationObservers(options: {
  navigation: 'rail' | undefined;
  contentRef: React.RefObject<HTMLDivElement | null>;
  viewportRef: React.RefObject<HTMLElement | null>;
  railTargetsRef: React.MutableRefObject<Map<string, HTMLElement>>;
  scheduleRailSync: () => void;
  setRailItems: React.Dispatch<React.SetStateAction<PreviewRailItem[]>>;
  setRailOverflowing: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const {
    navigation,
    contentRef,
    viewportRef,
    railTargetsRef,
    scheduleRailSync,
    setRailItems,
    setRailOverflowing,
  } = options;

  if (navigation !== 'rail') {
    clearRailNavigationState(railTargetsRef, setRailItems, setRailOverflowing);
    return;
  }

  const content = contentRef.current;
  const viewport = viewportRef.current;
  if (!content || !viewport) {
    return;
  }

  return attachRailObservers(content, viewport, scheduleRailSync);
}

export function useMessageScrollerRail(options: UseMessageScrollerRailOptions) {
  const {
    navigation,
    followThreshold,
    followOutput,
    reduce,
    smooth,
    onFollowChange,
    externalViewportRef,
  } = options;
  const viewportRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const followingRef = useRef(followOutput);
  const programmaticScrollRef = useRef(false);
  const scrollTimerRef = useRef<number | undefined>(undefined);
  const frameRef = useRef<number | undefined>(undefined);
  const scrollFrameRef = useRef<number | undefined>(undefined);
  const railFrameRef = useRef<number | undefined>(undefined);
  const railIdRef = useRef(new WeakMap<HTMLElement, string>());
  const railIdCounterRef = useRef(0);
  const railTargetsRef = useRef(new Map<string, HTMLElement>());
  const [railItems, setRailItems] = useState<PreviewRailItem[]>([]);
  const [activeRailId, setActiveRailId] = useState('');
  const [railOverflowing, setRailOverflowing] = useState(false);
  const externalViewportRefLatest = useRef(externalViewportRef);
  externalViewportRefLatest.current = externalViewportRef;

  const setViewportRef = useCallback((node: HTMLElement | null) => {
    viewportRef.current = node;
    const externalRef = externalViewportRefLatest.current;
    if (typeof externalRef === 'function') {
      externalRef(node);
    } else if (externalRef) {
      externalRef.current = node;
    }
  }, []);

  const setFollowing = useCallback(
    (next: boolean) => {
      if (followingRef.current === next) {
        return;
      }
      followingRef.current = next;
      onFollowChange?.(next);
    },
    [onFollowChange],
  );

  const updateActiveRailItem = useCallback(() => {
    if (navigation !== 'rail') {
      return;
    }
    const viewport = viewportRef.current;
    const targets = [...railTargetsRef.current.entries()];
    if (!viewport || targets.length === 0) {
      return;
    }
    const nextId = resolveActiveRailId(viewport, targets, followThreshold);
    setActiveRailId((current) => (current === nextId ? current : nextId));
  }, [followThreshold, navigation]);

  const syncRailItems = useCallback(() => {
    if (navigation !== 'rail') {
      return;
    }
    const content = contentRef.current;
    const viewport = viewportRef.current;
    if (!content || !viewport) {
      return;
    }

    const messages = Array.from(content.querySelectorAll<HTMLElement>('[data-slot="message"]'));
    const { items: nextItems, targets } = buildRailItems(
      messages,
      railIdRef.current,
      railIdCounterRef,
    );

    railTargetsRef.current = targets;
    setRailItems((current) => (railItemsUnchanged(current, nextItems) ? current : nextItems));
    setRailOverflowing(viewport.scrollHeight > viewport.clientHeight + 1 && messages.length > 1);
  }, [navigation]);

  const scheduleRailSync = useCallback(() => {
    if (navigation !== 'rail') {
      return;
    }
    if (railFrameRef.current) {
      cancelAnimationFrame(railFrameRef.current);
    }
    railFrameRef.current = requestAnimationFrame(() => {
      syncRailItems();
      updateActiveRailItem();
    });
  }, [navigation, syncRailItems, updateActiveRailItem]);

  const endProgrammaticScroll = useCallback(() => {
    programmaticScrollRef.current = false;
  }, []);

  const scrollToEnd = useCallback(
    (behavior: ScrollBehavior) => {
      const viewport = viewportRef.current;
      if (!viewport) {
        return;
      }
      programmaticScrollRef.current = true;
      scrollElementTo({
        viewport,
        top: viewport.scrollHeight,
        behavior,
        onProgrammaticEnd: endProgrammaticScroll,
        scrollTimerRef,
      });
    },
    [endProgrammaticScroll],
  );

  const scheduleScrollToEnd = useCallback(
    (behavior: ScrollBehavior) => {
      if (scrollFrameRef.current) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
      scrollFrameRef.current = requestAnimationFrame(() => {
        scrollToEnd(behavior);
        scrollFrameRef.current = undefined;
      });
    },
    [scrollToEnd],
  );

  const handleScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || programmaticScrollRef.current) {
      return;
    }
    const distance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    setFollowing(distance <= followThreshold);
    updateActiveRailItem();
  }, [followThreshold, setFollowing, updateActiveRailItem]);

  const leaveLiveEdge = useCallback(() => {
    programmaticScrollRef.current = false;
  }, []);

  const scrollToRailItem = useCallback(
    (item: PreviewRailItem) => {
      const viewport = viewportRef.current;
      const target = railTargetsRef.current.get(item.id);
      if (!viewport || !target) {
        return;
      }

      const lastItem = railItems.at(-1)?.id === item.id;
      setActiveRailId(item.id);
      if (lastItem) {
        setFollowing(true);
        scrollToEnd(scrollBehaviorFor(reduce, smooth));
        return;
      }

      setFollowing(false);
      programmaticScrollRef.current = true;
      scrollToRailTarget({
        viewport,
        target,
        reduce,
        smooth,
        scrollTimerRef,
        onProgrammaticEnd: endProgrammaticScroll,
      });
    },
    [endProgrammaticScroll, railItems, reduce, scrollToEnd, setFollowing, smooth],
  );

  useLayoutEffect(() => {
    followingRef.current = followOutput;
    if (!followOutput) {
      return;
    }
    frameRef.current = requestAnimationFrame(() => scrollToEnd('auto'));
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [followOutput, scrollToEnd]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => {
      scheduleRailSync();
      if (!followOutput || !followingRef.current) {
        return;
      }
      scheduleScrollToEnd('auto');
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [followOutput, scheduleRailSync, scheduleScrollToEnd]);

  useEffect(
    () =>
      setupRailNavigationObservers({
        navigation,
        contentRef,
        viewportRef,
        railTargetsRef,
        scheduleRailSync,
        setRailItems,
        setRailOverflowing,
      }),
    [navigation, scheduleRailSync],
  );

  useEffect(
    () => () =>
      clearMessageScrollerTimers({
        scrollTimerRef,
        frameRef,
        scrollFrameRef,
        railFrameRef,
      }),
    [],
  );

  return {
    viewportRef,
    contentRef,
    railItems,
    activeRailId,
    railOverflowing,
    handleScroll,
    leaveLiveEdge,
    scrollToRailItem,
    setViewportRef,
  };
}
