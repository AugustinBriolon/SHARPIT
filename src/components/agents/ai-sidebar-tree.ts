import type {
  SidebarResource,
  SidebarResourceDropPosition,
  SidebarResourceMove,
} from './ai-sidebar';
import type { FlatResource } from './ai-sidebar-types';

export function flattenResources(
  items: SidebarResource[],
  expanded: Set<string>,
  depth = 0,
  parentId: string | null = null,
): FlatResource[] {
  return items.flatMap((item) => {
    const row = { item, depth, parentId };
    if (!item.children?.length || !expanded.has(item.id)) {
      return [row];
    }
    return [row, ...flattenResources(item.children, expanded, depth + 1, item.id)];
  });
}

export function canContain(item: SidebarResource) {
  return item.kind === 'folder' || item.kind === 'project';
}

export function findResource(items: SidebarResource[], id: string): SidebarResource | undefined {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    const child = item.children ? findResource(item.children, id) : undefined;
    if (child) {
      return child;
    }
  }
}

export function containsResource(item: SidebarResource, id: string): boolean {
  return item.id === id || item.children?.some((child) => containsResource(child, id)) === true;
}

export function removeResource(
  items: SidebarResource[],
  id: string,
): { items: SidebarResource[]; removed?: SidebarResource } {
  let removed: SidebarResource | undefined;
  const next: SidebarResource[] = [];

  for (const item of items) {
    if (item.id === id) {
      removed = item;
      continue;
    }

    if (item.children?.length) {
      const { removed: childRemoved, items: childItems } = removeResource(item.children, id);
      if (childRemoved) {
        removed = childRemoved;
        next.push({ ...item, children: childItems });
        continue;
      }
    }

    next.push(item);
  }

  return { items: next, removed };
}

function insertAtTarget(
  item: SidebarResource,
  resource: SidebarResource,
  position: SidebarResourceDropPosition,
): SidebarResource[] {
  if (position === 'before') {
    return [resource, item];
  }
  if (position === 'after') {
    return [item, resource];
  }
  return [{ ...item, children: [...(item.children ?? []), resource] }];
}

export function insertResource(
  items: SidebarResource[],
  resource: SidebarResource,
  targetId: string | null,
  position: SidebarResourceDropPosition,
): SidebarResource[] {
  if (targetId === null) {
    return [...items, resource];
  }

  const next: SidebarResource[] = [];
  for (const item of items) {
    if (item.id === targetId) {
      next.push(...insertAtTarget(item, resource, position));
      continue;
    }

    if (item.children?.length) {
      next.push({
        ...item,
        children: insertResource(item.children, resource, targetId, position),
      });
    } else {
      next.push(item);
    }
  }
  return next;
}

function cannotDropInside(items: SidebarResource[], move: SidebarResourceMove): boolean {
  if (move.position !== 'inside') {
    return false;
  }
  const target = move.targetId ? findResource(items, move.targetId) : undefined;
  return !target || target.disabled || !canContain(target);
}

function isMoveBlocked(
  items: SidebarResource[],
  move: SidebarResourceMove,
  source: SidebarResource | undefined,
): boolean {
  if (!source || source.disabled) {
    return true;
  }
  if (move.targetId && containsResource(source, move.targetId)) {
    return true;
  }
  return cannotDropInside(items, move);
}

export function moveResource(
  items: SidebarResource[],
  move: SidebarResourceMove,
): SidebarResource[] | null {
  const source = findResource(items, move.itemId);
  if (isMoveBlocked(items, move, source)) {
    return null;
  }

  const removed = removeResource(items, move.itemId);
  if (!removed.removed) {
    return null;
  }
  return insertResource(removed.items, removed.removed, move.targetId, move.position);
}

export function renameResource(
  items: SidebarResource[],
  id: string,
  label: string,
): SidebarResource[] {
  return items.map((item) => ({
    ...item,
    label: item.id === id ? label : item.label,
    children: item.children ? renameResource(item.children, id, label) : undefined,
  }));
}

export function resolveDropPosition(
  item: SidebarResource,
  ratio: number,
  canContainItem: (item: SidebarResource) => boolean,
): 'inside' | 'before' | 'after' {
  if (!item.disabled && canContainItem(item) && ratio >= 0.25 && ratio <= 0.75) {
    return 'inside';
  }
  return ratio < 0.5 ? 'before' : 'after';
}
