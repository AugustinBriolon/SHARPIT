'use client';

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
import { motion, useReducedMotion } from 'motion/react';
import {
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
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
import type { AISidebarProps, SidebarResource, SidebarResourceMoveCommands } from './ai-sidebar';
import {
  createRowClickHandler,
  createRowDoubleClickHandler,
  createRowDragEndHandler,
  createRowDragStartHandler,
} from './ai-sidebar-row-handlers';
import { canContain } from './ai-sidebar-tree';
import type { DropTarget, FlatResource } from './ai-sidebar-types';

export interface ResourceRowProps {
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

function defaultIcon(item: SidebarResource, expanded: boolean) {
  let Icon: LucideIcon = FileText;
  if (item.kind === 'folder' || item.kind === 'project') {
    Icon = expanded ? FolderOpen : Folder;
  } else if (item.kind === 'bookmark') {
    Icon = Bookmark;
  }
  return <Icon className="size-4" />;
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

function MoveMenuItems({
  moves,
  runFromMenu,
}: {
  moves: SidebarResourceMoveCommands;
  runFromMenu: (action: () => void) => () => void;
}) {
  const entries = [
    moves.up ? { key: 'up', icon: ArrowUp, label: 'Move up', run: moves.up } : null,
    moves.down ? { key: 'down', icon: ArrowDown, label: 'Move down', run: moves.down } : null,
    moves.into
      ? {
          key: 'into',
          icon: FolderInput,
          label: `Move into ${moves.into.label}`,
          run: moves.into.run,
        }
      : null,
    moves.out ? { key: 'out', icon: Undo2, label: 'Move out', run: moves.out } : null,
  ].filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (entries.length === 0) {
    return null;
  }

  return (
    <>
      <div aria-hidden="true" className="bg-border my-1 h-px" />
      {entries.map((entry) => (
        <ResourceMenuAction key={entry.key} icon={entry.icon} onSelect={runFromMenu(entry.run)}>
          {entry.label}
        </ResourceMenuAction>
      ))}
    </>
  );
}

function DefaultResourceMenu({
  moves,
  onRenameStart,
  onMenuOpenChange,
}: {
  moves: SidebarResourceMoveCommands;
  onRenameStart: () => void;
  onMenuOpenChange: (open: boolean) => void;
}) {
  const runFromMenu = (action: () => void) => () => {
    onMenuOpenChange(false);
    action();
  };

  return (
    <>
      <ResourceMenuAction icon={Pencil} onSelect={runFromMenu(onRenameStart)}>
        Rename
      </ResourceMenuAction>
      <MoveMenuItems moves={moves} runFromMenu={runFromMenu} />
    </>
  );
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
      if (!viewport || !label) {
        return;
      }
      setDistance(label.scrollWidth > viewport.clientWidth ? label.scrollWidth + 24 : 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (viewportRef.current) {
      observer.observe(viewportRef.current);
    }
    if (labelRef.current) {
      observer.observe(labelRef.current);
    }
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
            : { duration: 0.16, ease: EASE_OUT }
        }
      >
        <span ref={labelRef}>{children}</span>
        {running ? <span aria-hidden="true">{children}</span> : null}
      </motion.span>
    </span>
  );
}

function ResourceRowRenameInput({
  label,
  inputRef,
  draft,
  onDraftChange,
  onCommit,
  onCancel,
}: {
  label: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  draft: string;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const skipRenameBlurRef = useRef(false);

  return (
    <input
      ref={inputRef}
      aria-label={`Rename ${label}`}
      className="border-border bg-background text-foreground focus-visible:ring-ring mx-1 h-7 min-w-0 flex-1 rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
      draggable={false}
      value={draft}
      onChange={(event) => onDraftChange(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onBlur={() => {
        if (!skipRenameBlurRef.current) {
          onCommit();
        }
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Enter') {
          skipRenameBlurRef.current = true;
          onCommit();
        }
        if (event.key === 'Escape') {
          skipRenameBlurRef.current = true;
          onCancel();
        }
      }}
    />
  );
}

function resourceRowClassName(
  acceptsChildren: boolean,
  active: boolean,
  disabled: boolean | undefined,
): string {
  return cn(
    'group/resource relative flex min-h-9 min-w-0 cursor-pointer items-center gap-2.5 rounded-xl pr-3 text-sm outline-none',
    'text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
    'focus-visible:bg-muted/70 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-inset',
    'data-[menu-open=true]:bg-muted data-[menu-open=true]:text-foreground',
    'data-[dragging=true]:opacity-40',
    'data-[drop=inside]:bg-primary/10 data-[drop=inside]:ring-primary/45 data-[drop=inside]:ring-1',
    'data-[drop=before]:before:bg-primary data-[drop=before]:before:absolute data-[drop=before]:before:-top-0.5 data-[drop=before]:before:right-2 data-[drop=before]:before:left-2 data-[drop=before]:before:h-0.5 data-[drop=before]:before:rounded-full',
    'data-[drop=after]:after:bg-primary data-[drop=after]:after:absolute data-[drop=after]:after:right-2 data-[drop=after]:after:-bottom-0.5 data-[drop=after]:after:left-2 data-[drop=after]:after:h-0.5 data-[drop=after]:after:rounded-full',
    !acceptsChildren && active && 'bg-muted text-foreground',
    disabled && 'cursor-not-allowed opacity-45',
  );
}

function buildResourceMenu(options: {
  row: FlatResource;
  moves: SidebarResourceMoveCommands;
  renderMenu?: AISidebarProps['renderMenu'];
  onMenuOpenChange: (open: boolean) => void;
  onRenameStart: () => void;
}) {
  const { row, moves, renderMenu, onMenuOpenChange, onRenameStart } = options;
  return (
    renderMenu?.(row.item, {
      close: () => onMenuOpenChange(false),
      rename: () => {
        onMenuOpenChange(false);
        onRenameStart();
      },
      moves,
    }) ?? (
      <DefaultResourceMenu
        moves={moves}
        onMenuOpenChange={onMenuOpenChange}
        onRenameStart={onRenameStart}
      />
    )
  );
}

function ResourceRowMenu({
  row,
  menu,
  menuOpen,
  canTouch,
  onMenuOpenChange,
}: {
  row: FlatResource;
  menu: ReactNode;
  menuOpen: boolean;
  canTouch: boolean;
  onMenuOpenChange: (open: boolean) => void;
}) {
  return (
    <MorphPopover open={menuOpen} onOpenChange={onMenuOpenChange}>
      <MorphPopoverTrigger>
        <button
          aria-label={`Actions for ${row.item.label}`}
          draggable={false}
          tabIndex={-1}
          type="button"
          className={cn(
            'hover:bg-foreground/5 focus-visible:ring-ring grid size-7 shrink-0 place-items-center rounded-lg transition-opacity outline-none group-hover/resource:opacity-100 group-data-[menu-open=true]/resource:opacity-100 focus-visible:opacity-100 focus-visible:ring-2',
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
  );
}

function resourceRowTabIndex(focused: boolean) {
  return focused ? 0 : -1;
}

function resourceRowDraggable(disabled: boolean | undefined, renaming: boolean) {
  return !disabled && !renaming;
}

function resourceRowAriaProps(options: {
  row: FlatResource;
  acceptsChildren: boolean;
  active: boolean;
  expanded: boolean;
  focused: boolean;
  isDragging: boolean;
  dropPosition: string | null;
  menuOpen: boolean;
  renaming: boolean;
}) {
  const {
    row,
    acceptsChildren,
    active,
    expanded,
    focused,
    isDragging,
    dropPosition,
    menuOpen,
    renaming,
  } = options;
  return {
    'aria-disabled': row.item.disabled || undefined,
    'aria-expanded': acceptsChildren ? expanded : undefined,
    'aria-level': row.depth + 1,
    'aria-selected': acceptsChildren ? undefined : active,
    'data-dragging': isDragging || undefined,
    'data-drop': dropPosition ?? undefined,
    'data-menu-open': menuOpen || undefined,
    draggable: resourceRowDraggable(row.item.disabled, renaming),
    tabIndex: resourceRowTabIndex(focused),
  } as const;
}

function ResourceRowBody({
  row,
  expanded,
  renaming,
  hovered,
  menuOpen,
  draft,
  inputRef,
  renderIcon,
  onDraftChange,
  onRenameCancel,
  onRenameCommit,
}: {
  row: FlatResource;
  expanded: boolean;
  renaming: boolean;
  hovered: boolean;
  menuOpen: boolean;
  draft: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  renderIcon?: ResourceRowProps['renderIcon'];
  onDraftChange: (value: string) => void;
  onRenameCancel: () => void;
  onRenameCommit: () => void;
}) {
  return (
    <>
      <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center">
        {renderIcon?.(row.item) ?? defaultIcon(row.item, expanded)}
      </span>
      {renaming ? (
        <ResourceRowRenameInput
          draft={draft}
          inputRef={inputRef}
          label={row.item.label}
          onCancel={onRenameCancel}
          onCommit={onRenameCommit}
          onDraftChange={onDraftChange}
        />
      ) : (
        <MarqueeLabel active={hovered || menuOpen}>{row.item.label}</MarqueeLabel>
      )}
    </>
  );
}

export function ResourceRow({
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
  const draggedRef = useRef(false);
  const [draft, setDraft] = useState(row.item.label);
  const acceptsChildren = canContain(row.item);
  const isDragging = draggingId === row.item.id;
  const dropPosition = dropTarget?.id === row.item.id ? dropTarget.position : null;

  useEffect(() => {
    if (!renaming) {
      return;
    }
    setDraft(row.item.label);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [renaming, row.item.label]);

  const menu = buildResourceMenu({
    row,
    moves,
    renderMenu,
    onMenuOpenChange,
    onRenameStart,
  });

  const interactionOptions = {
    acceptsChildren,
    renaming,
    disabled: row.item.disabled,
    draggedRef,
    onToggle,
    onSelect,
    onRenameStart,
    onDragEnd,
    onDragStart,
    row,
  };

  return (
    <motion.div
      ref={setRef}
      className={resourceRowClassName(acceptsChildren, active, row.item.disabled)}
      layout="position"
      role="treeitem"
      style={{ paddingLeft: `${12 + row.depth * 16}px` }}
      transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
      {...resourceRowAriaProps({
        row,
        acceptsChildren,
        active,
        expanded,
        focused,
        isDragging,
        dropPosition,
        menuOpen,
        renaming,
      })}
      onClick={createRowClickHandler(interactionOptions)}
      onDoubleClick={createRowDoubleClickHandler(interactionOptions)}
      onDragEndCapture={createRowDragEndHandler(interactionOptions)}
      onDragOver={(event) => onDragOver(event, row)}
      onDragStartCapture={createRowDragStartHandler(interactionOptions)}
      onDrop={onDrop}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <ResourceRowBody
        draft={draft}
        expanded={expanded}
        hovered={hovered}
        inputRef={inputRef}
        menuOpen={menuOpen}
        renaming={renaming}
        renderIcon={renderIcon}
        row={row}
        onDraftChange={setDraft}
        onRenameCancel={onRenameCancel}
        onRenameCommit={() => onRenameCommit(draft)}
      />

      {!renaming && !row.item.disabled ? (
        <ResourceRowMenu
          canTouch={canTouch}
          menu={menu}
          menuOpen={menuOpen}
          row={row}
          onMenuOpenChange={onMenuOpenChange}
        />
      ) : null}
    </motion.div>
  );
}
