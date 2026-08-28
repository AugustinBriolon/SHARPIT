'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { useDismiss } from '@/lib/hooks/use-dismiss';
import { useHoverGesture } from '@/lib/hooks/use-hover-gesture';
import { useTapGesture } from '@/lib/hooks/use-tap-gesture';
import { previewRailHighlightedId, previewRailSelectedId } from './preview-rail-state-helpers';
import type { PreviewRailItem } from './preview-rail';

export function usePreviewRailState({
  items,
  activeId,
  defaultActiveId,
  onActiveChange,
  highlightActive,
}: {
  items: PreviewRailItem[];
  activeId?: string;
  defaultActiveId?: string;
  onActiveChange?: (id: string) => void;
  highlightActive: boolean;
}) {
  const uid = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [internalActiveId, setInternalActiveId] = useState(defaultActiveId ?? items[0]?.id ?? '');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const tap = useTapGesture<boolean>();
  const hover = useHoverGesture();

  const clearPinned = useCallback(() => setPinnedId(null), []);
  useDismiss(pinnedId !== null, clearPinned, rootRef);

  const requestedActiveId = activeId ?? internalActiveId;
  const selectedId = previewRailSelectedId(items, requestedActiveId);
  const displayedId = hoveredId ?? pinnedId ?? focusedId ?? '';
  const highlightedId = previewRailHighlightedId(displayedId, highlightActive, selectedId);
  const displayedIndex = items.findIndex((item) => item.id === highlightedId);

  const selectItem = useCallback(
    (id: string) => {
      if (activeId === undefined) {
        setInternalActiveId(id);
      }
      onActiveChange?.(id);
    },
    [activeId, onActiveChange],
  );

  const handleRootBlur = useCallback((relatedTarget: EventTarget | null, currentTarget: Node) => {
    const relatedNode = relatedTarget instanceof Node ? relatedTarget : null;
    if (!currentTarget.contains(relatedNode)) {
      setFocusedId(null);
      setPinnedId(null);
    }
  }, []);

  return {
    uid,
    rootRef,
    tap,
    hover,
    selectedId,
    displayedId,
    highlightedId,
    displayedIndex,
    pinnedId,
    selectItem,
    setHoveredId,
    setPinnedId,
    setFocusedId,
    handleRootBlur,
  };
}
