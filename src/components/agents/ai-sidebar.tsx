'use client';

import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useMenuFocus, useSidebarDragDrop, useSidebarState } from './ai-sidebar-hooks';
import { canContain, renameResource } from './ai-sidebar-tree';
import { SidebarAnnouncement, TopLevelDropHint } from './ai-sidebar-tree-list';
import { SidebarTreePanel } from './ai-sidebar-tree-panel';
import type { FlatResource } from './ai-sidebar-types';

export type SidebarResourceKind = 'folder' | 'project' | 'file' | 'bookmark';

export interface SidebarResource {
  id: string;
  label: string;
  kind: SidebarResourceKind;
  children?: SidebarResource[];
  disabled?: boolean;
}

export type SidebarResourceDropPosition = 'before' | 'inside' | 'after';

export interface SidebarResourceMove {
  itemId: string;
  targetId: string | null;
  position: SidebarResourceDropPosition;
}

export interface SidebarResourceMoveCommands {
  up?: () => void;
  down?: () => void;
  into?: { label: string; run: () => void };
  out?: () => void;
}

export interface SidebarResourceMenuControls {
  close: () => void;
  rename: () => void;
  moves: SidebarResourceMoveCommands;
}

export interface AISidebarProps {
  items?: SidebarResource[];
  defaultItems?: SidebarResource[];
  onItemsChange?: (items: SidebarResource[]) => void;
  onMove?: (move: SidebarResourceMove) => void | Promise<void>;
  onMoveError?: (error: unknown, move: SidebarResourceMove) => void;
  onRename?: (item: SidebarResource, label: string) => void | Promise<void>;
  activeId?: string | null;
  defaultActiveId?: string | null;
  onActiveChange?: (id: string) => void;
  defaultExpandedIds?: string[];
  renderIcon?: (item: SidebarResource) => React.ReactNode;
  renderMenu?: (item: SidebarResource, controls: SidebarResourceMenuControls) => React.ReactNode;
  ariaLabel?: string;
  className?: string;
}

function buildMoveCommands(
  row: FlatResource,
  flat: FlatResource[],
  performMove: (move: SidebarResourceMove) => void,
  setExpandedIds: React.Dispatch<React.SetStateAction<Set<string>>>,
): SidebarResourceMoveCommands {
  if (row.item.disabled) {
    return {};
  }
  const index = flat.findIndex(({ item }) => item.id === row.item.id);
  const previous = flat[index - 1];
  const next = flat[index + 1];
  const { parentId } = row;
  const commands: SidebarResourceMoveCommands = {};

  if (previous) {
    commands.up = () =>
      void performMove({ itemId: row.item.id, targetId: previous.item.id, position: 'before' });
  }
  if (next) {
    commands.down = () =>
      void performMove({ itemId: row.item.id, targetId: next.item.id, position: 'after' });
  }
  if (previous && canContain(previous.item) && previous.item.id !== parentId) {
    commands.into = {
      label: previous.item.label,
      run: () => {
        setExpandedIds((current) => new Set(current).add(previous.item.id));
        void performMove({
          itemId: row.item.id,
          targetId: previous.item.id,
          position: 'inside',
        });
      },
    };
  }
  if (parentId) {
    commands.out = () =>
      void performMove({ itemId: row.item.id, targetId: parentId, position: 'after' });
  }
  return commands;
}

function resolveFocusedRow(flat: FlatResource[], focusedId: string | null): string | null {
  if (focusedId !== null && flat.some((row) => row.item.id === focusedId)) {
    return focusedId;
  }
  return flat[0]?.item.id ?? null;
}

export function AISidebar(props: AISidebarProps) {
  const {
    items,
    defaultItems,
    onItemsChange,
    onMove,
    onMoveError,
    onRename,
    activeId,
    defaultActiveId,
    onActiveChange,
    defaultExpandedIds,
    renderIcon,
    renderMenu,
    ariaLabel = 'Resources',
    className,
  } = props;

  const state = useSidebarState({
    items,
    defaultItems,
    onItemsChange,
    onMove,
    onMoveError,
    onRename,
    activeId,
    defaultActiveId,
    onActiveChange,
    defaultExpandedIds,
  });

  const focusedRow = resolveFocusedRow(state.flat, state.focusedId);
  if (state.focusedId !== focusedRow) {
    state.setFocusedId(focusedRow);
  }

  useMenuFocus(state.menuOpenId);

  const focusRow = useCallback(
    (id: string) => {
      state.setFocusedId(id);
      requestAnimationFrame(() => state.rowRefs.current.get(id)?.focus());
    },
    [state.rowRefs, state.setFocusedId],
  );

  const select = useCallback(
    (id: string) => {
      if (state.activeId === undefined) {
        state.setInternalActiveId(id);
      }
      state.onActiveChange?.(id);
    },
    [state.activeId, state.onActiveChange, state.setInternalActiveId],
  );

  const toggle = useCallback(
    (id: string) => {
      state.setExpandedIds((current) => {
        const next = new Set(current);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [state.setExpandedIds],
  );

  const buildMoves = useCallback(
    (row: FlatResource) =>
      buildMoveCommands(row, state.flat, state.performMove, state.setExpandedIds),
    [state.flat, state.performMove, state.setExpandedIds],
  );

  const dragDrop = useSidebarDragDrop({
    renderedItems: state.renderedItems,
    draggingId: state.draggingId,
    dropTarget: state.dropTarget,
    performMove: state.performMove,
    setDropTarget: state.setDropTarget,
  });

  const handleRenameCommit = useCallback(
    (row: FlatResource, label: string) => {
      const trimmed = label.trim();
      state.setRenamingId(null);
      if (!trimmed || trimmed === row.item.label) {
        return;
      }
      const before = state.renderedItems;
      state.updateItems(renameResource(before, row.item.id, trimmed));
      void Promise.resolve(state.onRename?.(row.item, trimmed)).catch(() => {
        state.updateItems(before);
        state.setAnnouncement(`Rename failed. ${row.item.label} was restored.`);
      });
    },
    [
      state.onRename,
      state.renderedItems,
      state.setAnnouncement,
      state.setRenamingId,
      state.updateItems,
    ],
  );

  return (
    <>
      <div
        aria-label={ariaLabel}
        aria-multiselectable="false"
        role="tree"
        className={cn(
          'relative flex min-w-0 flex-col gap-0.5 [overflow-anchor:none] group-data-[state=collapsed]/sidebar:hidden',
          state.draggingId && 'pb-9 select-none',
          className,
        )}
        onDragOver={dragDrop.handleTreeDragOver}
        onDrop={dragDrop.handleTreeDrop}
      >
        <SidebarTreePanel
          buildMoves={buildMoves}
          dragDrop={dragDrop}
          focusedRow={focusedRow}
          focusRow={focusRow}
          handleRenameCommit={handleRenameCommit}
          renderIcon={renderIcon}
          renderMenu={renderMenu}
          select={select}
          state={state}
          toggle={toggle}
        />
        {state.draggingId ? <TopLevelDropHint active={state.dropTarget?.id === null} /> : null}
      </div>
      <SidebarAnnouncement>{state.announcement}</SidebarAnnouncement>
    </>
  );
}
