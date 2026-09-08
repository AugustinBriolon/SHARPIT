'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ActivityChip } from '@/components/training/activity/list/activity-list-chip';
import {
  estimateActivityHistoryRowSize,
  flattenActivityWeekGroups,
  formatWeekSessionCount,
  type ActivityWeekGroup,
} from '@/components/training/hub/training-list-logbook';

const MAIN_SCROLL_ID = 'main-content';
const ROW_GAP_PX = 10;
const DEFAULT_VIEWPORT_HEIGHT = 800;

function measureScrollMargin(listEl: HTMLElement, scrollEl: HTMLElement): number {
  return (
    listEl.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top + scrollEl.scrollTop
  );
}

/**
 * Virtualized history logbook — only mounts ~overscan CompletedSessionPreview
 * cards so GPS stream fetches stay bounded while scrolling `#main-content`.
 */
export function ActivityHistoryVirtualList({
  weekGroups,
  recordLabelsById,
  selectionMode,
  selectedIds,
  onToggle,
}: {
  weekGroups: ActivityWeekGroup[];
  recordLabelsById: Map<string, string>;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggle: (activityId: string) => void;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  const rows = useMemo(() => flattenActivityWeekGroups(weekGroups), [weekGroups]);

  useLayoutEffect(() => {
    const scrollEl = document.getElementById(MAIN_SCROLL_ID);
    const listEl = listRef.current;
    if (!scrollEl || !listEl) {
      return;
    }

    setScrollElement(scrollEl);

    const updateMargin = () => {
      setScrollMargin(measureScrollMargin(listEl, scrollEl));
    };

    updateMargin();

    const resizeObserver = new ResizeObserver(updateMargin);
    resizeObserver.observe(scrollEl);
    if (scrollEl.firstElementChild) {
      resizeObserver.observe(scrollEl.firstElementChild);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [rows.length]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElement,
    estimateSize: (index) => {
      const row = rows[index];
      if (!row) {
        return 220;
      }
      return estimateActivityHistoryRowSize(row) + (row.kind === 'activity' ? ROW_GAP_PX : 0);
    },
    overscan: 2,
    scrollMargin,
    initialRect: {
      width: 0,
      height:
        typeof window !== 'undefined'
          ? Math.max(window.innerHeight, DEFAULT_VIEWPORT_HEIGHT)
          : DEFAULT_VIEWPORT_HEIGHT,
    },
    measureElement:
      typeof window !== 'undefined' && !navigator.userAgent.includes('Firefox')
        ? (element) => element.getBoundingClientRect().height
        : undefined,
  });

  if (rows.length === 0) {
    return null;
  }

  return (
    <div ref={listRef} className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const row = rows[virtualRow.index];
        if (!row) {
          return null;
        }

        return (
          <div
            key={row.key}
            ref={virtualizer.measureElement}
            className="absolute top-0 left-0 w-full"
            data-index={virtualRow.index}
            style={{ transform: `translateY(${virtualRow.start - scrollMargin}px)` }}
          >
            {row.kind === 'week' ? (
              <header className="bg-background/95 supports-backdrop-filter:bg-background/80 flex items-end justify-between gap-3 px-0.5 py-2 backdrop-blur-md">
                <h3 className="text-label text-foreground m-0">{row.label}</h3>
                <p className="text-data text-muted-foreground text-xs tabular-nums">
                  {formatWeekSessionCount(row.count)}
                </p>
              </header>
            ) : (
              <div className="pb-2.5">
                <ActivityChip
                  activity={row.activity}
                  recordLabel={recordLabelsById.get(row.activity.id) ?? null}
                  selected={selectedIds.has(row.activity.id)}
                  selectionMode={selectionMode}
                  mapEnabled
                  onToggle={onToggle}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
