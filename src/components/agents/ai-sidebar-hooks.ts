import { type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  canContain,
  containsResource,
  findResource,
  flattenResources,
  resolveDropPosition,
} from './ai-sidebar-tree';
import { executeSidebarMove } from './ai-sidebar-tree-list';
import type { DropTarget, FlatResource } from './ai-sidebar-types';
import type { AISidebarProps, SidebarResource, SidebarResourceMove } from './ai-sidebar';

function isDragBlocked(
  draggingId: string,
  targetRow: FlatResource,
  renderedItems: SidebarResource[],
): boolean {
  if (draggingId === targetRow.item.id) {
    return true;
  }
  const source = findResource(renderedItems, draggingId);
  return Boolean(source && containsResource(source, targetRow.item.id));
}

export function useSidebarDragDrop(options: {
  renderedItems: SidebarResource[];
  draggingId: string | null;
  dropTarget: DropTarget | null;
  performMove: (move: SidebarResourceMove) => void;
  setDropTarget: (target: DropTarget | null) => void;
}) {
  const { renderedItems, draggingId, dropTarget, performMove, setDropTarget } = options;
  const handleTreeDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!draggingId || event.target !== event.currentTarget) {
        return;
      }
      event.preventDefault();
      setDropTarget({ id: null, position: 'after' });
    },
    [draggingId, setDropTarget],
  );

  const handleTreeDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (draggingId && dropTarget) {
        performMove({ itemId: draggingId, targetId: dropTarget.id, position: dropTarget.position });
      }
    },
    [draggingId, dropTarget, performMove],
  );

  const handleRowDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>, targetRow: FlatResource) => {
      if (!draggingId || isDragBlocked(draggingId, targetRow, renderedItems)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = (event.clientY - rect.top) / rect.height;
      const position = resolveDropPosition(targetRow.item, ratio, canContain);
      setDropTarget({ id: targetRow.item.id, position });
    },
    [draggingId, renderedItems, setDropTarget],
  );

  const handleRowDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (draggingId && dropTarget) {
        performMove({ itemId: draggingId, targetId: dropTarget.id, position: dropTarget.position });
      }
    },
    [draggingId, dropTarget, performMove],
  );

  return { handleTreeDragOver, handleTreeDrop, handleRowDragOver, handleRowDrop };
}

export function useSidebarState(props: AISidebarProps) {
  const {
    items,
    defaultItems = [],
    onItemsChange,
    onMove,
    onMoveError,
    onRename,
    activeId,
    defaultActiveId = null,
    onActiveChange,
    defaultExpandedIds = [],
  } = props;

  const [internalItems, setInternalItems] = useState(items ?? defaultItems);
  const [internalActiveId, setInternalActiveId] = useState(defaultActiveId);
  const [expandedIds, setExpandedIds] = useState(() => new Set(defaultExpandedIds));
  const [focusedId, setFocusedId] = useState<string | null>(activeId ?? defaultActiveId);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const movePendingRef = useRef(false);

  useEffect(() => {
    if (items) {
      setInternalItems(items);
    }
  }, [items]);

  const renderedItems = internalItems;
  const selectedId = activeId ?? internalActiveId;

  const flat = useMemo(
    () => flattenResources(renderedItems, expandedIds),
    [expandedIds, renderedItems],
  );

  const updateItems = useCallback(
    (next: SidebarResource[]) => {
      setInternalItems(next);
      onItemsChange?.(next);
    },
    [onItemsChange],
  );

  const performMove = useCallback(
    (move: SidebarResourceMove) =>
      void executeSidebarMove(move, {
        renderedItems,
        updateItems,
        onMove,
        onMoveError,
        setAnnouncement,
        setDropTarget,
        setDraggingId,
        movePendingRef,
      }),
    [onMove, onMoveError, renderedItems, updateItems],
  );

  return {
    flat,
    expandedIds,
    setExpandedIds,
    focusedId,
    setFocusedId,
    draggingId,
    setDraggingId,
    dropTarget,
    setDropTarget,
    menuOpenId,
    setMenuOpenId,
    renamingId,
    setRenamingId,
    announcement,
    rowRefs,
    renderedItems,
    selectedId,
    updateItems,
    performMove,
    activeId,
    onActiveChange,
    setInternalActiveId,
    onRename,
    setAnnouncement,
  };
}

export function useMenuFocus(menuOpenId: string | null) {
  useEffect(() => {
    if (!menuOpenId) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      const menus = Array.from(
        document.querySelectorAll<HTMLElement>('[data-sidebar-resource-menu]'),
      );
      menus
        .find((menu) => menu.dataset.sidebarResourceMenu === menuOpenId)
        ?.querySelector<HTMLElement>('button, a[href]')
        ?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [menuOpenId]);
}
