import type { Dispatch, KeyboardEvent, SetStateAction } from 'react';
import type { FlatResource } from './ai-sidebar-types';
import type { SidebarResourceMove } from './ai-sidebar';
import { canContain } from './ai-sidebar-tree';

export type KeyboardContext = {
  flat: FlatResource[];
  expandedIds: Set<string>;
  focusRow: (id: string) => void;
  performMove: (move: SidebarResourceMove) => void;
  select: (id: string) => void;
  toggle: (id: string) => void;
  setExpandedIds: Dispatch<SetStateAction<Set<string>>>;
  setRenamingId: (id: string) => void;
  setMenuOpenId: (id: string) => void;
};

type RowNeighbors = {
  previous?: FlatResource;
  next?: FlatResource;
};

type KeyHandlerInput = {
  event: KeyboardEvent<HTMLDivElement>;
  row: FlatResource;
  neighbors: RowNeighbors;
  moveModifier: boolean;
  ctx: KeyboardContext;
};

function rowNeighbors(flat: FlatResource[], row: FlatResource): RowNeighbors {
  const index = flat.findIndex(({ item }) => item.id === row.item.id);
  return { previous: flat[index - 1], next: flat[index + 1] };
}

export function handleResourceTreeKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  row: FlatResource,
  ctx: KeyboardContext,
): void {
  const input: KeyHandlerInput = {
    event,
    row,
    neighbors: rowNeighbors(ctx.flat, row),
    moveModifier: event.altKey && event.shiftKey,
    ctx,
  };

  if (tryVerticalFocus(input)) {
    return;
  }
  if (tryHomeEndFocus(input)) {
    return;
  }
  if (row.item.disabled) {
    handleDisabledRowKeyDown(input);
    return;
  }
  if (tryMoveModifierKeys(input)) {
    return;
  }
  handleNavigationKeys(input);
}

function tryVerticalFocus({ event, neighbors, moveModifier, ctx }: KeyHandlerInput): boolean {
  if (moveModifier) {
    return false;
  }
  if (event.key === 'ArrowDown' && neighbors.next) {
    event.preventDefault();
    ctx.focusRow(neighbors.next.item.id);
    return true;
  }
  if (event.key === 'ArrowUp' && neighbors.previous) {
    event.preventDefault();
    ctx.focusRow(neighbors.previous.item.id);
    return true;
  }
  return false;
}

function tryHomeEndFocus({ event, row, ctx }: KeyHandlerInput): boolean {
  if (event.key === 'Home' && ctx.flat[0]) {
    event.preventDefault();
    ctx.focusRow(ctx.flat[0].item.id);
    return true;
  }
  if (event.key === 'End' && ctx.flat.at(-1)) {
    event.preventDefault();
    ctx.focusRow(ctx.flat.at(-1)?.item.id ?? row.item.id);
    return true;
  }
  return false;
}

function handleDisabledRowKeyDown({ event, row, moveModifier }: KeyHandlerInput): void {
  if (event.key === 'ArrowLeft' && row.parentId) {
    event.preventDefault();
    return;
  }
  if (
    moveModifier ||
    ['ArrowRight', 'Enter', ' ', 'F2', 'ContextMenu'].includes(event.key) ||
    (event.shiftKey && event.key === 'F10')
  ) {
    event.preventDefault();
  }
}

function tryMoveModifierKeys({
  event,
  row,
  neighbors,
  moveModifier,
  ctx,
}: KeyHandlerInput): boolean {
  if (!moveModifier) {
    return false;
  }
  return (
    tryMoveBeforePrevious({ event, row, neighbors, ctx }) ||
    tryMoveAfterNext({ event, row, neighbors, ctx }) ||
    tryMoveIntoPrevious({ event, row, neighbors, ctx }) ||
    tryMoveOutOfParent({ event, row, ctx })
  );
}

function tryMoveBeforePrevious({
  event,
  row,
  neighbors,
  ctx,
}: Pick<KeyHandlerInput, 'event' | 'row' | 'neighbors' | 'ctx'>): boolean {
  if (event.key !== 'ArrowUp' || !neighbors.previous) {
    return false;
  }
  event.preventDefault();
  ctx.performMove({
    itemId: row.item.id,
    targetId: neighbors.previous.item.id,
    position: 'before',
  });
  return true;
}

function tryMoveAfterNext({
  event,
  row,
  neighbors,
  ctx,
}: Pick<KeyHandlerInput, 'event' | 'row' | 'neighbors' | 'ctx'>): boolean {
  if (event.key !== 'ArrowDown' || !neighbors.next) {
    return false;
  }
  event.preventDefault();
  ctx.performMove({
    itemId: row.item.id,
    targetId: neighbors.next.item.id,
    position: 'after',
  });
  return true;
}

function tryMoveIntoPrevious({
  event,
  row,
  neighbors,
  ctx,
}: Pick<KeyHandlerInput, 'event' | 'row' | 'neighbors' | 'ctx'>): boolean {
  if (event.key !== 'ArrowRight' || !neighbors.previous || !canContain(neighbors.previous.item)) {
    return false;
  }
  event.preventDefault();
  ctx.setExpandedIds((current) => new Set(current).add(neighbors.previous!.item.id));
  ctx.performMove({
    itemId: row.item.id,
    targetId: neighbors.previous.item.id,
    position: 'inside',
  });
  return true;
}

function tryMoveOutOfParent({
  event,
  row,
  ctx,
}: Pick<KeyHandlerInput, 'event' | 'row' | 'ctx'>): boolean {
  if (event.key !== 'ArrowLeft' || !row.parentId) {
    return false;
  }
  event.preventDefault();
  ctx.performMove({ itemId: row.item.id, targetId: row.parentId, position: 'after' });
  return true;
}

function handleArrowRightNavigation({ event, row, neighbors, ctx }: KeyHandlerInput): boolean {
  if (event.key !== 'ArrowRight' || !canContain(row.item)) {
    return false;
  }
  event.preventDefault();
  if (!ctx.expandedIds.has(row.item.id)) {
    ctx.toggle(row.item.id);
  } else if (neighbors.next?.parentId === row.item.id) {
    ctx.focusRow(neighbors.next.item.id);
  }
  return true;
}

function handleArrowLeftNavigation({ event, row, ctx }: KeyHandlerInput): boolean {
  if (event.key !== 'ArrowLeft') {
    return false;
  }
  event.preventDefault();
  if (ctx.expandedIds.has(row.item.id)) {
    ctx.toggle(row.item.id);
  } else if (row.parentId) {
    ctx.focusRow(row.parentId);
  }
  return true;
}

function handleActivationKeys({ event, row, ctx }: KeyHandlerInput): boolean {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return false;
  }
  event.preventDefault();
  if (canContain(row.item)) {
    ctx.toggle(row.item.id);
  } else {
    ctx.select(row.item.id);
  }
  return true;
}

function handleContextMenuKeys({ event, row, ctx }: KeyHandlerInput): boolean {
  if (event.key === 'F2') {
    event.preventDefault();
    ctx.setRenamingId(row.item.id);
    return true;
  }
  if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
    event.preventDefault();
    ctx.setMenuOpenId(row.item.id);
    return true;
  }
  return false;
}

function handleNavigationKeys(input: KeyHandlerInput): void {
  if (handleArrowRightNavigation(input)) {
    return;
  }
  if (handleArrowLeftNavigation(input)) {
    return;
  }
  if (handleActivationKeys(input)) {
    return;
  }
  handleContextMenuKeys(input);
}
