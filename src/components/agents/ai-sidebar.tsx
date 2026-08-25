'use client';
// beui.dev/components/agents/chat-app

import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  FileText,
  Folder,
  FolderInput,
  FolderOpen,
  type LucideIcon,
  MoreHorizontal,
  Pencil,
  Undo2,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  MorphPopover,
  MorphPopoverContent,
  MorphPopoverTrigger,
} from '@/components/motion/popover-morph';
import { EASE_OUT, SPRING_LAYOUT } from '@/lib/ease';
import { useTouchCapable } from '@/lib/hooks/use-touch-capable';
import { cn } from '@/lib/utils';

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

/**
 * The moves this row can make right now, the same four the keyboard offers on
 * `Alt+Shift+Arrow`. A pointer drag is the fast path for them; a finger has no
 * drag to give, so the row menu carries them too. Absent keys are moves this
 * row cannot make from where it sits.
 */
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
  /** Reject the promise to roll the optimistic move back. */
  onMove?: (move: SidebarResourceMove) => void | Promise<void>;
  onMoveError?: (error: unknown, move: SidebarResourceMove) => void;
  onRename?: (item: SidebarResource, label: string) => void | Promise<void>;
  activeId?: string | null;
  defaultActiveId?: string | null;
  onActiveChange?: (id: string) => void;
  defaultExpandedIds?: string[];
  renderIcon?: (item: SidebarResource) => ReactNode;
  renderMenu?: (item: SidebarResource, controls: SidebarResourceMenuControls) => ReactNode;
  ariaLabel?: string;
  className?: string;
}

interface FlatResource {
  item: SidebarResource;
  depth: number;
  parentId: string | null;
}

interface DropTarget {
  id: string | null;
  position: SidebarResourceDropPosition;
}

const ROW_REVEAL = {
  duration: 0.16,
  ease: EASE_OUT,
} as const;

function canContain(item: SidebarResource) {
  return item.kind === 'folder' || item.kind === 'project';
}

function flattenResources(
  items: SidebarResource[],
  expanded: Set<string>,
  depth = 0,
  parentId: string | null = null,
): FlatResource[] {
  return items.flatMap((item) => {
    const row = { item, depth, parentId };
    if (!item.children?.length || !expanded.has(item.id)) return [row];
    return [row, ...flattenResources(item.children, expanded, depth + 1, item.id)];
  });
}

function findResource(items: SidebarResource[], id: string): SidebarResource | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const child = item.children ? findResource(item.children, id) : undefined;
    if (child) return child;
  }
}

function containsResource(item: SidebarResource, id: string): boolean {
  return item.id === id || item.children?.some((child) => containsResource(child, id)) === true;
}

function removeResource(
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

function insertResource(
  items: SidebarResource[],
  resource: SidebarResource,
  targetId: string | null,
  position: SidebarResourceDropPosition,
): SidebarResource[] {
  if (targetId === null) return [...items, resource];

  const next: SidebarResource[] = [];
  for (const item of items) {
    if (item.id === targetId) {
      if (position === 'before') next.push(resource, item);
      else if (position === 'after') next.push(item, resource);
      else next.push({ ...item, children: [...(item.children ?? []), resource] });
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

function moveResource(
  items: SidebarResource[],
  move: SidebarResourceMove,
): SidebarResource[] | null {
  const source = findResource(items, move.itemId);
  if (!source || source.disabled) return null;
  if (move.targetId && containsResource(source, move.targetId)) return null;

  const target = move.targetId ? findResource(items, move.targetId) : undefined;
  if (move.position === 'inside' && (!target || target.disabled || !canContain(target)))
    return null;

  const removed = removeResource(items, move.itemId);
  if (!removed.removed) return null;
  return insertResource(removed.items, removed.removed, move.targetId, move.position);
}

function renameResource(items: SidebarResource[], id: string, label: string): SidebarResource[] {
  return items.map((item) => ({
    ...item,
    label: item.id === id ? label : item.label,
    children: item.children ? renameResource(item.children, id, label) : undefined,
  }));
}

function resolveDropPosition(
  item: SidebarResource,
  ratio: number,
  canContainItem: (item: SidebarResource) => boolean,
): 'inside' | 'before' | 'after' {
  if (!item.disabled && canContainItem(item) && ratio >= 0.25 && ratio <= 0.75) {
    return 'inside';
  }
  return ratio < 0.5 ? 'before' : 'after';
}

function defaultIcon(item: SidebarResource, expanded: boolean) {
  let Icon: LucideIcon = FileText;
  if (item.kind === 'folder' || item.kind === 'project') {
    Icon = expanded ? FolderOpen : Folder;
  } else if (item.kind === 'bookmark') {
    Icon = Bookmark;
  }
  return <Icon className="size-4" />;
}

function MarqueeLabel({ active, children }: { active: boolean; children: string }) {
  const reduce = useReducedMotion() ?? false;
  const viewportRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const measure = () => {
      const viewport = viewportRef.current;
      const label = labelRef.current;
      if (!viewport || !label) return;
      setDistance(label.scrollWidth > viewport.clientWidth ? label.scrollWidth + 24 : 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (viewportRef.current) observer.observe(viewportRef.current);
    if (labelRef.current) observer.observe(labelRef.current);
    return () => observer.disconnect();
  }, []);

  const running = active && distance > 0 && !reduce;

  return (
    <span ref={viewportRef} className="block min-w-0 flex-1 overflow-hidden">
      <motion.span
        animate={{ x: running ? [0, -distance] : 0 }}
        className="flex w-max items-center gap-6 whitespace-nowrap"
        transition={
          running
            ? {
                duration: Math.max(2.4, distance / 34),
                ease: 'linear',
                repeat: Number.POSITIVE_INFINITY,
                repeatDelay: 2,
              }
            : ROW_REVEAL
        }
      >
        <span ref={labelRef}>{children}</span>
        {running ? <span aria-hidden="true">{children}</span> : null}
      </motion.span>
    </span>
  );
}

function ResourceMenuAction({
  icon: Icon,
  onSelect,
  children,
}: {
  icon: LucideIcon;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className="text-foreground hover:bg-muted focus-visible:bg-muted focus-visible:ring-ring flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs transition-colors outline-none focus-visible:ring-2"
      type="button"
      onClick={onSelect}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}

interface ResourceRowProps {
  row: FlatResource;
  active: boolean;
  expanded: boolean;
  focused: boolean;
  draggingId: string | null;
  dropTarget: DropTarget | null;
  menuOpen: boolean;
  moves: SidebarResourceMoveCommands;
  renaming: boolean;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, row: FlatResource) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, id: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onMenuOpenChange: (open: boolean) => void;
  onRenameCancel: () => void;
  onRenameCommit: (label: string) => void;
  onRenameStart: () => void;
  onSelect: () => void;
  onToggle: () => void;
  renderIcon?: (item: SidebarResource) => ReactNode;
  renderMenu?: AISidebarProps['renderMenu'];
  setRef: (node: HTMLDivElement | null) => void;
}

function ResourceRow({
  row,
  active,
  expanded,
  focused,
  draggingId,
  dropTarget,
  menuOpen,
  moves,
  renaming,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onFocus,
  onKeyDown,
  onMenuOpenChange,
  onRenameCancel,
  onRenameCommit,
  onRenameStart,
  onSelect,
  onToggle,
  renderIcon,
  renderMenu,
  setRef,
}: ResourceRowProps) {
  const reduce = useReducedMotion() ?? false;
  const canTouch = useTouchCapable();
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipRenameBlurRef = useRef(false);
  const draggedRef = useRef(false);
  const [draft, setDraft] = useState(row.item.label);
  const acceptsChildren = canContain(row.item);
  const isDragging = draggingId === row.item.id;
  const dropPosition = dropTarget?.id === row.item.id ? dropTarget.position : null;

  useEffect(() => {
    if (!renaming) return;
    skipRenameBlurRef.current = false;
    setDraft(row.item.label);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [renaming, row.item.label]);

  const runFromMenu = (action: () => void) => () => {
    onMenuOpenChange(false);
    action();
  };

  const menu = renderMenu?.(row.item, {
    close: () => onMenuOpenChange(false),
    rename: () => {
      onMenuOpenChange(false);
      onRenameStart();
    },
    moves,
  }) ?? (
    <>
      <ResourceMenuAction icon={Pencil} onSelect={runFromMenu(onRenameStart)}>
        Rename
      </ResourceMenuAction>
      {moves.up || moves.down || moves.into || moves.out ? (
        <div aria-hidden="true" className="bg-border my-1 h-px" />
      ) : null}
      {moves.up ? (
        <ResourceMenuAction icon={ArrowUp} onSelect={runFromMenu(moves.up)}>
          Move up
        </ResourceMenuAction>
      ) : null}
      {moves.down ? (
        <ResourceMenuAction icon={ArrowDown} onSelect={runFromMenu(moves.down)}>
          Move down
        </ResourceMenuAction>
      ) : null}
      {moves.into ? (
        <ResourceMenuAction icon={FolderInput} onSelect={runFromMenu(moves.into.run)}>
          Move into {moves.into.label}
        </ResourceMenuAction>
      ) : null}
      {moves.out ? (
        <ResourceMenuAction icon={Undo2} onSelect={runFromMenu(moves.out)}>
          Move out
        </ResourceMenuAction>
      ) : null}
    </>
  );

  return (
    <motion.div
      ref={setRef}
      aria-disabled={row.item.disabled || undefined}
      aria-expanded={acceptsChildren ? expanded : undefined}
      aria-level={row.depth + 1}
      aria-selected={acceptsChildren ? undefined : active}
      data-dragging={isDragging || undefined}
      data-drop={dropPosition ?? undefined}
      data-menu-open={menuOpen || undefined}
      draggable={!row.item.disabled && !renaming}
      layout="position"
      role="treeitem"
      style={{ paddingLeft: `${12 + row.depth * 16}px` }}
      tabIndex={focused ? 0 : -1}
      transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
      className={cn(
        'group/resource relative flex min-h-9 min-w-0 cursor-pointer items-center gap-2.5 rounded-xl pr-3 text-sm outline-none',
        'text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
        'focus-visible:bg-muted/70 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-inset',
        'data-[menu-open=true]:bg-muted data-[menu-open=true]:text-foreground',
        'data-[dragging=true]:opacity-40',
        'data-[drop=inside]:bg-primary/10 data-[drop=inside]:ring-primary/45 data-[drop=inside]:ring-1',
        'data-[drop=before]:before:bg-primary data-[drop=before]:before:absolute data-[drop=before]:before:-top-0.5 data-[drop=before]:before:right-2 data-[drop=before]:before:left-2 data-[drop=before]:before:h-0.5 data-[drop=before]:before:rounded-full',
        'data-[drop=after]:after:bg-primary data-[drop=after]:after:absolute data-[drop=after]:after:right-2 data-[drop=after]:after:-bottom-0.5 data-[drop=after]:after:left-2 data-[drop=after]:after:h-0.5 data-[drop=after]:after:rounded-full',
        !acceptsChildren && active && 'bg-muted text-foreground',
        row.item.disabled && 'cursor-not-allowed opacity-45',
      )}
      onDragOver={(event) => onDragOver(event, row)}
      onDrop={onDrop}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(event) => {
        if (event.defaultPrevented || draggedRef.current || renaming || row.item.disabled) return;
        if (acceptsChildren) onToggle();
        else onSelect();
      }}
      onDoubleClick={(event) => {
        if (acceptsChildren || row.item.disabled) return;
        event.preventDefault();
        onRenameStart();
      }}
      onDragEndCapture={() => {
        onDragEnd();
        requestAnimationFrame(() => {
          draggedRef.current = false;
        });
      }}
      onDragStartCapture={(event) => {
        draggedRef.current = true;
        onDragStart(event, row.item.id);
      }}
    >
      <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center">
        {renderIcon?.(row.item) ?? defaultIcon(row.item, expanded)}
      </span>

      {renaming ? (
        <input
          ref={inputRef}
          aria-label={`Rename ${row.item.label}`}
          className="border-border bg-background text-foreground focus-visible:ring-ring mx-1 h-7 min-w-0 flex-1 rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
          draggable={false}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onBlur={() => {
            if (!skipRenameBlurRef.current) onRenameCommit(draft);
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Enter') {
              skipRenameBlurRef.current = true;
              onRenameCommit(draft);
            }
            if (event.key === 'Escape') {
              skipRenameBlurRef.current = true;
              onRenameCancel();
            }
          }}
        />
      ) : (
        <MarqueeLabel active={hovered || menuOpen}>{row.item.label}</MarqueeLabel>
      )}

      {!renaming && !row.item.disabled ? (
        <MorphPopover open={menuOpen} onOpenChange={onMenuOpenChange}>
          <MorphPopoverTrigger>
            <button
              aria-label={`Actions for ${row.item.label}`}
              draggable={false}
              tabIndex={-1}
              type="button"
              className={cn(
                'hover:bg-foreground/5 focus-visible:ring-ring grid size-7 shrink-0 place-items-center rounded-lg transition-opacity outline-none group-hover/resource:opacity-100 group-data-[menu-open=true]/resource:opacity-100 focus-visible:opacity-100 focus-visible:ring-2',
                // A finger never hovers, and this menu is the only path to
                // rename and move without a drag — keep it on screen there.
                canTouch ? 'opacity-100' : 'opacity-0',
              )}
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontal aria-hidden="true" className="size-4" />
            </button>
          </MorphPopoverTrigger>
          <MorphPopoverContent
            align="end"
            className="w-40 p-1.5"
            radius={12}
            side="bottom"
            sideOffset={8}
          >
            <div data-sidebar-resource-menu={row.item.id}>{menu}</div>
          </MorphPopoverContent>
        </MorphPopover>
      ) : null}
    </motion.div>
  );
}

export function AISidebar({
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
  renderIcon,
  renderMenu,
  ariaLabel = 'Resources',
  className,
}: AISidebarProps) {
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
  const renderedItems = internalItems;
  const selectedId = activeId ?? internalActiveId;

  useEffect(() => {
    if (items) setInternalItems(items);
  }, [items]);

  const flat = useMemo(
    () => flattenResources(renderedItems, expandedIds),
    [expandedIds, renderedItems],
  );

  // Which row carries the roving tabindex is resolved during render, never in
  // a passive effect: an effect lands after the browser paints, so the first
  // commit — and, on a server-rendered page, the markup itself — would have no
  // tabbable row and Tab would skip the whole tree. The same hole opens again
  // whenever a collapse or a rolled-back move takes the focused row out of it.
  const focusedRow =
    focusedId !== null && flat.some((row) => row.item.id === focusedId)
      ? focusedId
      : (flat[0]?.item.id ?? null);
  if (focusedId !== focusedRow) setFocusedId(focusedRow);

  useEffect(() => {
    if (!menuOpenId) return;
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

  const updateItems = useCallback(
    (next: SidebarResource[]) => {
      setInternalItems(next);
      onItemsChange?.(next);
    },
    [onItemsChange],
  );

  const performMove = useCallback(
    async (move: SidebarResourceMove) => {
      if (movePendingRef.current) {
        setAnnouncement('Wait for the current move to finish.');
        return;
      }
      const before = renderedItems;
      const next = moveResource(before, move);
      if (!next || next === before) return;

      movePendingRef.current = true;
      updateItems(next);
      setDropTarget(null);
      setDraggingId(null);
      const moved = findResource(before, move.itemId);
      const target = move.targetId ? findResource(before, move.targetId) : null;
      setAnnouncement(
        target
          ? `Moved ${moved?.label ?? 'item'} ${move.position} ${target.label}.`
          : `Moved ${moved?.label ?? 'item'} to the top level.`,
      );

      try {
        await onMove?.(move);
      } catch (error) {
        updateItems(before);
        setAnnouncement(`Move failed. ${moved?.label ?? 'Item'} was restored.`);
        onMoveError?.(error, move);
      } finally {
        movePendingRef.current = false;
      }
    },
    [onMove, onMoveError, renderedItems, updateItems],
  );

  const focusRow = useCallback((id: string) => {
    setFocusedId(id);
    requestAnimationFrame(() => rowRefs.current.get(id)?.focus());
  }, []);

  const select = useCallback(
    (id: string) => {
      if (activeId === undefined) setInternalActiveId(id);
      onActiveChange?.(id);
    },
    [activeId, onActiveChange],
  );

  const toggle = useCallback((id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // The same four moves `Alt+Shift+Arrow` performs, handed to the row menu so
  // they survive on a device with no drag and no modifier keys.
  const moveCommands = useCallback(
    (row: FlatResource): SidebarResourceMoveCommands => {
      if (row.item.disabled) return {};
      const index = flat.findIndex(({ item }) => item.id === row.item.id);
      const previous = flat[index - 1];
      const next = flat[index + 1];
      const { parentId } = row;
      const commands: SidebarResourceMoveCommands = {};

      if (previous) {
        commands.up = () =>
          void performMove({
            itemId: row.item.id,
            targetId: previous.item.id,
            position: 'before',
          });
      }
      if (next) {
        commands.down = () =>
          void performMove({
            itemId: row.item.id,
            targetId: next.item.id,
            position: 'after',
          });
      }
      // Only offer the reparent when it lands somewhere new — the row above a
      // folder's first child is the folder it already lives in.
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
          void performMove({
            itemId: row.item.id,
            targetId: parentId,
            position: 'after',
          });
      }

      return commands;
    },
    [flat, performMove],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, row: FlatResource) => {
      const index = flat.findIndex(({ item }) => item.id === row.item.id);
      const previous = flat[index - 1];
      const next = flat[index + 1];
      const moveModifier = event.altKey && event.shiftKey;

      if (event.key === 'ArrowDown' && !moveModifier && next) {
        event.preventDefault();
        focusRow(next.item.id);
        return;
      }
      if (event.key === 'ArrowUp' && !moveModifier && previous) {
        event.preventDefault();
        focusRow(previous.item.id);
        return;
      }
      if (event.key === 'Home' && flat[0]) {
        event.preventDefault();
        focusRow(flat[0].item.id);
        return;
      }
      if (event.key === 'End' && flat.at(-1)) {
        event.preventDefault();
        focusRow(flat.at(-1)?.item.id ?? row.item.id);
        return;
      }

      if (row.item.disabled) {
        if (event.key === 'ArrowLeft' && row.parentId) {
          event.preventDefault();
          focusRow(row.parentId);
        } else if (
          moveModifier ||
          ['ArrowRight', 'Enter', ' ', 'F2', 'ContextMenu'].includes(event.key) ||
          (event.shiftKey && event.key === 'F10')
        ) {
          event.preventDefault();
        }
        return;
      }

      if (moveModifier && event.key === 'ArrowUp' && previous) {
        event.preventDefault();
        void performMove({ itemId: row.item.id, targetId: previous.item.id, position: 'before' });
        return;
      }
      if (moveModifier && event.key === 'ArrowDown' && next) {
        event.preventDefault();
        void performMove({ itemId: row.item.id, targetId: next.item.id, position: 'after' });
        return;
      }
      if (moveModifier && event.key === 'ArrowRight' && previous && canContain(previous.item)) {
        event.preventDefault();
        setExpandedIds((current) => new Set(current).add(previous.item.id));
        void performMove({ itemId: row.item.id, targetId: previous.item.id, position: 'inside' });
        return;
      }
      if (moveModifier && event.key === 'ArrowLeft' && row.parentId) {
        event.preventDefault();
        void performMove({ itemId: row.item.id, targetId: row.parentId, position: 'after' });
        return;
      }

      if (event.key === 'ArrowRight' && canContain(row.item)) {
        event.preventDefault();
        if (!expandedIds.has(row.item.id)) toggle(row.item.id);
        else if (next?.parentId === row.item.id) focusRow(next.item.id);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (expandedIds.has(row.item.id)) toggle(row.item.id);
        else if (row.parentId) focusRow(row.parentId);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (canContain(row.item)) toggle(row.item.id);
        else select(row.item.id);
      } else if (event.key === 'F2') {
        event.preventDefault();
        setRenamingId(row.item.id);
      } else if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
        event.preventDefault();
        setMenuOpenId(row.item.id);
      }
    },
    [expandedIds, flat, focusRow, performMove, select, toggle],
  );

  return (
    <>
      <div
        aria-label={ariaLabel}
        aria-multiselectable="false"
        role="tree"
        className={cn(
          'relative flex min-w-0 flex-col gap-0.5 [overflow-anchor:none] group-data-[state=collapsed]/sidebar:hidden',
          draggingId && 'pb-9 select-none',
          className,
        )}
        onDragOver={(event) => {
          if (!draggingId || event.target !== event.currentTarget) return;
          event.preventDefault();
          setDropTarget({ id: null, position: 'after' });
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (draggingId && dropTarget) {
            void performMove({
              itemId: draggingId,
              targetId: dropTarget.id,
              position: dropTarget.position,
            });
          }
        }}
      >
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
              moves={moveCommands(row)}
              renaming={renamingId === row.item.id}
              renderIcon={renderIcon}
              renderMenu={renderMenu}
              row={row}
              setRef={(node) => {
                if (node) rowRefs.current.set(row.item.id, node);
                else rowRefs.current.delete(row.item.id);
              }}
              onFocus={() => setFocusedId(row.item.id)}
              onKeyDown={(event) => handleKeyDown(event, row)}
              onRenameCancel={() => setRenamingId(null)}
              onRenameStart={() => setRenamingId(row.item.id)}
              onSelect={() => select(row.item.id)}
              onToggle={() => toggle(row.item.id)}
              onDragEnd={() => {
                setDraggingId(null);
                setDropTarget(null);
              }}
              onDragOver={(event, targetRow) => {
                if (!draggingId || draggingId === targetRow.item.id) return;
                const source = findResource(renderedItems, draggingId);
                if (source && containsResource(source, targetRow.item.id)) return;
                event.preventDefault();
                event.stopPropagation();
                const rect = event.currentTarget.getBoundingClientRect();
                const ratio = (event.clientY - rect.top) / rect.height;
                const position = resolveDropPosition(targetRow.item, ratio, canContain);
                setDropTarget({ id: targetRow.item.id, position });
              }}
              onDragStart={(event, id) => {
                setDraggingId(id);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (draggingId && dropTarget) {
                  void performMove({
                    itemId: draggingId,
                    targetId: dropTarget.id,
                    position: dropTarget.position,
                  });
                }
              }}
              onMenuOpenChange={(open) => {
                setMenuOpenId(open ? row.item.id : null);
                if (!open) focusRow(row.item.id);
              }}
              onRenameCommit={(label) => {
                const trimmed = label.trim();
                setRenamingId(null);
                if (!trimmed || trimmed === row.item.label) return;
                const before = renderedItems;
                updateItems(renameResource(before, row.item.id, trimmed));
                void Promise.resolve(onRename?.(row.item, trimmed)).catch(() => {
                  updateItems(before);
                  setAnnouncement(`Rename failed. ${row.item.label} was restored.`);
                });
              }}
            />
          ))}
        </AnimatePresence>

        {draggingId ? (
          <div
            aria-hidden="true"
            className="border-border text-muted-foreground data-[active=true]:border-primary/50 data-[active=true]:bg-primary/10 data-[active=true]:text-foreground absolute inset-x-1 bottom-0 flex h-8 items-center justify-center rounded-lg border border-dashed text-[10px]"
            data-active={dropTarget?.id === null || undefined}
          >
            Move to top level
          </div>
        ) : null}
      </div>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </>
  );
}
