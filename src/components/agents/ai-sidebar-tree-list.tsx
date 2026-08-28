'use client';

import { AnimatePresence } from 'motion/react';
import type { DragEvent, ReactNode } from 'react';
import type {
  AISidebarProps,
  SidebarResource,
  SidebarResourceMove,
  SidebarResourceMoveCommands,
} from './ai-sidebar';
import { findResource, moveResource } from './ai-sidebar-tree';
import { ResourceRow } from './ai-sidebar-resource-row';
import type { DropTarget, FlatResource } from './ai-sidebar-types';

type SidebarTreeListProps = {
  flat: FlatResource[];
  selectedId: string | null;
  draggingId: string | null;
  dropTarget: DropTarget | null;
  expandedIds: Set<string>;
  focusedRow: string | null;
  menuOpenId: string | null;
  renamingId: string | null;
  renderIcon?: AISidebarProps['renderIcon'];
  renderMenu?: AISidebarProps['renderMenu'];
  buildMoveCommands: (row: FlatResource) => SidebarResourceMoveCommands;
  rowRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onFocusRow: (id: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>, row: FlatResource) => void;
  onRenameCancel: () => void;
  onRenameStart: (id: string) => void;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDragEnd: () => void;
  onRowDragOver: (event: DragEvent<HTMLDivElement>, row: FlatResource) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, id: string) => void;
  onRowDrop: (event: DragEvent<HTMLDivElement>) => void;
  onMenuOpenChange: (rowId: string, open: boolean) => void;
  onRenameCommit: (row: FlatResource, label: string) => void;
};

export function SidebarTreeList({
  flat,
  selectedId,
  draggingId,
  dropTarget,
  expandedIds,
  focusedRow,
  menuOpenId,
  renamingId,
  renderIcon,
  renderMenu,
  buildMoveCommands,
  rowRefs,
  onFocusRow,
  onKeyDown,
  onRenameCancel,
  onRenameStart,
  onSelect,
  onToggle,
  onDragEnd,
  onRowDragOver,
  onDragStart,
  onRowDrop,
  onMenuOpenChange,
  onRenameCommit,
}: SidebarTreeListProps) {
  return (
    <AnimatePresence initial={false}>
      {flat.map((row) => (
        <ResourceRow
          key={row.item.id}
          active={selectedId === row.item.id}
          draggingId={draggingId}
          dropTarget={dropTarget}
          expanded={expandedIds.has(row.item.id)}
          focused={focusedRow === row.item.id}
          menuOpen={menuOpenId === row.item.id}
          moves={buildMoveCommands(row)}
          renaming={renamingId === row.item.id}
          renderIcon={renderIcon}
          renderMenu={renderMenu}
          row={row}
          setRef={(node) => {
            if (node) {
              rowRefs.current.set(row.item.id, node);
            } else {
              rowRefs.current.delete(row.item.id);
            }
          }}
          onDragEnd={onDragEnd}
          onDragOver={onRowDragOver}
          onDragStart={onDragStart}
          onDrop={onRowDrop}
          onFocus={() => onFocusRow(row.item.id)}
          onKeyDown={(event) => onKeyDown(event, row)}
          onMenuOpenChange={(open) => onMenuOpenChange(row.item.id, open)}
          onRenameCancel={onRenameCancel}
          onRenameCommit={(label) => onRenameCommit(row, label)}
          onRenameStart={() => onRenameStart(row.item.id)}
          onSelect={() => onSelect(row.item.id)}
          onToggle={() => onToggle(row.item.id)}
        />
      ))}
    </AnimatePresence>
  );
}

export function TopLevelDropHint({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="border-border text-muted-foreground data-[active=true]:border-primary/50 data-[active=true]:bg-primary/10 data-[active=true]:text-foreground absolute inset-x-1 bottom-0 flex h-8 items-center justify-center rounded-lg border border-dashed text-[10px]"
      data-active={active || undefined}
    >
      Move to top level
    </div>
  );
}

export function SidebarAnnouncement({ children }: { children: ReactNode }) {
  return (
    <span aria-live="polite" className="sr-only">
      {children}
    </span>
  );
}

export type PerformMoveDeps = {
  renderedItems: SidebarResource[];
  updateItems: (items: SidebarResource[]) => void;
  onMove?: (move: SidebarResourceMove) => void | Promise<void>;
  onMoveError?: (error: unknown, move: SidebarResourceMove) => void;
  setAnnouncement: (message: string) => void;
  setDropTarget: (target: DropTarget | null) => void;
  setDraggingId: (id: string | null) => void;
  movePendingRef: React.MutableRefObject<boolean>;
};

export async function executeSidebarMove(move: SidebarResourceMove, deps: PerformMoveDeps) {
  if (deps.movePendingRef.current) {
    deps.setAnnouncement('Wait for the current move to finish.');
    return;
  }

  const before = deps.renderedItems;
  const next = moveResource(before, move);
  if (!next || next === before) {
    return;
  }

  const moved = findResource(before, move.itemId);
  applyOptimisticMove(move, before, moved, deps);
  await finalizeSidebarMove(move, before, moved, deps);
}

function applyOptimisticMove(
  move: SidebarResourceMove,
  before: SidebarResource[],
  moved: SidebarResource | undefined,
  deps: PerformMoveDeps,
) {
  const next = moveResource(before, move)!;
  deps.movePendingRef.current = true;
  deps.updateItems(next);
  deps.setDropTarget(null);
  deps.setDraggingId(null);
  deps.setAnnouncement(formatMoveAnnouncement(move, before, moved));
}

async function finalizeSidebarMove(
  move: SidebarResourceMove,
  before: SidebarResource[],
  moved: SidebarResource | undefined,
  deps: PerformMoveDeps,
) {
  try {
    await deps.onMove?.(move);
  } catch (error) {
    deps.updateItems(before);
    deps.setAnnouncement(`Move failed. ${moved?.label ?? 'Item'} was restored.`);
    deps.onMoveError?.(error, move);
  } finally {
    deps.movePendingRef.current = false;
  }
}

function formatMoveAnnouncement(
  move: SidebarResourceMove,
  before: SidebarResource[],
  moved?: SidebarResource,
): string {
  const target = move.targetId ? findResource(before, move.targetId) : null;
  const label = moved?.label ?? 'item';
  if (target) {
    return `Moved ${label} ${move.position} ${target.label}.`;
  }
  return `Moved ${label} to the top level.`;
}
