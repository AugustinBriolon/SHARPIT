'use client';

import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { Plus, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { PromptSubmitIcon } from '@/components/agents/prompt-input-submit-icon';
import type { CoachDiscussContext } from '@/lib/coach/chat/coach-discuss-context';
import { cn } from '@/lib/utils';
import { handlePromptBarKeyDown } from '@/components/coach/chat/coach-prompt-bar-keyboard';

export const PROMPT_BAR_EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

export type SourceRow = {
  key: string;
  name: string;
  desc: string;
  context: CoachDiscussContext;
  icon: ReactNode;
};

function getHighlightOpacity(
  rowBox: { top: number; height: number } | null,
  engaged: boolean,
  hasRows: boolean,
): number {
  if (rowBox === null || !engaged || !hasRows) {
    return 0;
  }
  return 1;
}

function getHighlightTransition(reduce: boolean): string {
  if (reduce) {
    return 'opacity 150ms ease';
  }
  return `top 220ms ${PROMPT_BAR_EASE_OUT}, height 220ms ${PROMPT_BAR_EASE_OUT}, opacity 150ms ease`;
}

function getSourceMenuHighlightStyle(
  rowBox: { top: number; height: number } | null,
  engaged: boolean,
  hasRows: boolean,
  reduce: boolean,
) {
  return {
    top: rowBox?.top ?? 0,
    height: rowBox?.height ?? 0,
    opacity: getHighlightOpacity(rowBox, engaged, hasRows),
    transition: getHighlightTransition(reduce),
  };
}

function SourceMenuHighlight({
  rowBox,
  engaged,
  hasRows,
  reduce,
}: {
  rowBox: { top: number; height: number } | null;
  engaged: boolean;
  hasRows: boolean;
  reduce: boolean;
}) {
  return (
    <span
      className="bg-muted pointer-events-none absolute inset-x-1 rounded-[10px] sm:rounded-[8px]"
      style={getSourceMenuHighlightStyle(rowBox, engaged, hasRows, reduce)}
      aria-hidden
    />
  );
}

function SourceMenuRow({
  row,
  index,
  active,
  onActiveChange,
  onEngage,
  onPick,
  rowRef,
}: {
  row: SourceRow;
  index: number;
  active: number;
  onActiveChange: (index: number) => void;
  onEngage: () => void;
  onPick: (row: SourceRow) => void;
  rowRef: (element: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      key={row.key}
      ref={rowRef}
      aria-selected={index === active}
      className="relative z-10 flex min-h-11 w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left sm:min-h-10 sm:rounded-[8px]"
      role="option"
      type="button"
      onClick={() => onPick(row)}
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={() => {
        onActiveChange(index);
        onEngage();
      }}
    >
      <span className="text-muted-foreground flex size-6 shrink-0 items-center justify-center">
        {row.icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-foreground truncate text-[13px] leading-tight font-medium">
          {row.name}
        </span>
        <span className="text-muted-foreground truncate text-[11px] leading-tight">{row.desc}</span>
      </span>
    </button>
  );
}

export function SourcesMenu({
  rows,
  active,
  engaged,
  onActiveChange,
  onEngage,
  onDisengage,
  onPick,
}: {
  rows: SourceRow[];
  active: number;
  engaged: boolean;
  onActiveChange: (index: number) => void;
  onEngage: () => void;
  onDisengage: () => void;
  onPick: (row: SourceRow) => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [rowBox, setRowBox] = useState<{ top: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const target = rowRefs.current[active];
    if (!target) {
      return;
    }
    setRowBox({ top: target.offsetTop, height: target.offsetHeight });
  }, [active, rows.length]);

  const exitAnimation = reduce
    ? undefined
    : { opacity: 0, transform: 'scale(0.97) translateY(4px)' };
  const initialAnimation = reduce
    ? false
    : { opacity: 0, transform: 'scale(0.97) translateY(4px)' };

  return (
    <motion.div
      animate={{ opacity: 1, transform: 'scale(1) translateY(0px)' }}
      aria-label="Sources et contextes"
      exit={exitAnimation}
      initial={initialAnimation}
      role="listbox"
      style={{ transformOrigin: 'bottom center' }}
      transition={{ duration: reduce ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        'border-border bg-popover absolute inset-x-0 bottom-full z-10 mb-2 overflow-y-auto border p-1 shadow-lg',
        'max-h-[min(36dvh,15rem)] rounded-[14px] sm:max-h-[min(46dvh,18rem)] sm:rounded-[12px]',
      )}
      onMouseLeave={onDisengage}
    >
      <SourceMenuHighlight
        engaged={engaged}
        hasRows={rows.length > 0}
        reduce={reduce}
        rowBox={rowBox}
      />

      {rows.map((row, index) => (
        <SourceMenuRow
          key={row.key}
          active={active}
          index={index}
          row={row}
          rowRef={(element) => {
            rowRefs.current[index] = element;
          }}
          onActiveChange={onActiveChange}
          onEngage={onEngage}
          onPick={onPick}
        />
      ))}

      {rows.length === 0 ? (
        <div className="text-muted-foreground flex min-h-11 items-center px-2.5 text-[12px]">
          Aucun contexte disponible
        </div>
      ) : null}

      <div className="border-border text-muted-foreground mt-1 border-t px-2.5 pt-1.5 pb-1 text-[11px]">
        Attache un contexte à ce message
      </div>
    </motion.div>
  );
}

export function AttachedChip({
  context,
  onDetach,
}: {
  context: CoachDiscussContext;
  onDetach: () => void;
}) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.span
      animate={{ opacity: 1, transform: 'scale(1)' }}
      className="bg-muted text-muted-foreground flex h-6.5 items-center rounded-full py-1 pr-0.5 pl-1.5 text-[11.5px] shadow-sm"
      initial={reduce ? false : { opacity: 0, transform: 'scale(0.97)' }}
      transition={{ duration: reduce ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }}
    >
      <span className="text-foreground max-w-36 truncate">{context.label}</span>
      <button
        aria-label={`Retirer ${context.label}`}
        className="text-muted-foreground hover:bg-border/70 hover:text-foreground -my-1 flex size-6 items-center justify-center rounded-full transition-colors duration-100"
        type="button"
        onClick={onDetach}
      >
        <X className="size-2.5" strokeWidth={2.5} aria-hidden />
      </button>
    </motion.span>
  );
}

export function PromptBarChips({
  attachedContext,
  leadingChips,
  onDetachContext,
}: {
  attachedContext: CoachDiscussContext | null;
  leadingChips?: ReactNode;
  onDetachContext?: () => void;
}) {
  const hasAttachedChip = Boolean(attachedContext && onDetachContext);
  if (!hasAttachedChip && !leadingChips) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-1">
      {hasAttachedChip ? (
        <AttachedChip context={attachedContext!} onDetach={onDetachContext!} />
      ) : null}
      {leadingChips}
    </div>
  );
}

export function PromptBarPlusButton({
  canAttach,
  disabled,
  loading,
  plusOpen,
  onToggle,
}: {
  canAttach: boolean;
  disabled: boolean;
  loading: boolean;
  plusOpen: boolean;
  onToggle: () => void;
}) {
  if (!canAttach) {
    return <span className="size-7" aria-hidden />;
  }

  return (
    <button
      aria-expanded={plusOpen}
      aria-label="Ajouter pièces jointes et contextes"
      disabled={disabled || loading}
      type="button"
      className={cn(
        'text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full',
        'transition-[background-color,color,transform] duration-150',
        'hover:bg-muted hover:text-foreground active:scale-[0.94]',
        'disabled:pointer-events-none disabled:opacity-50',
        plusOpen && 'bg-muted text-foreground',
      )}
      onClick={onToggle}
    >
      <Plus
        className={cn('size-3.5 transition-transform duration-150', plusOpen && 'rotate-45')}
        strokeWidth={2}
        style={{ transitionTimingFunction: PROMPT_BAR_EASE_OUT }}
        aria-hidden
      />
    </button>
  );
}

export function PromptBarSendButton({
  canSend,
  disabled,
  loading,
  onSend,
  onStop,
}: {
  canSend: boolean;
  disabled: boolean;
  loading: boolean;
  onSend: () => void;
  onStop?: () => void;
}) {
  const isActive = loading || canSend;

  return (
    <button
      aria-label={loading ? 'Arrêter' : 'Envoyer'}
      disabled={loading ? !onStop : !canSend}
      type="button"
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-full',
        'transition-[background-color,color,transform] duration-200',
        'enabled:active:scale-[0.94]',
        isActive ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground',
      )}
      onClick={() => {
        if (loading) {
          onStop?.();
          return;
        }
        onSend();
      }}
    >
      <span className="grid size-3.5 place-items-center [&_svg]:size-3.5">
        <PromptSubmitIcon loading={loading} />
      </span>
    </button>
  );
}

export function PromptBarTextarea({
  ariaLabel,
  disabled,
  inputRef,
  menuOpen,
  placeholder,
  sourcesLength,
  tall,
  value,
  onCloseMenu,
  onMenuNavigate,
  onMenuPick,
  onSubmit,
  onValueChange,
}: {
  ariaLabel: string;
  disabled: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  menuOpen: boolean;
  placeholder: string;
  sourcesLength: number;
  tall: boolean;
  value: string;
  onCloseMenu: () => void;
  onMenuNavigate: (direction: 'ArrowDown' | 'ArrowUp') => void;
  onMenuPick: () => void;
  onSubmit: () => void;
  onValueChange: (value: string) => void;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    handlePromptBarKeyDown(event, {
      menuOpen,
      sourcesLength,
      onMenuNavigate,
      onMenuPick,
      onCloseMenu,
      onSubmit,
    });
  };

  return (
    <textarea
      ref={inputRef}
      aria-label={ariaLabel}
      disabled={disabled}
      placeholder={placeholder}
      rows={1}
      value={value}
      className={cn(
        'text-foreground placeholder:text-muted-foreground w-full min-w-0 resize-none',
        'bg-transparent px-1.5 text-[13px] [overflow-wrap:anywhere] outline-none',
        tall ? 'min-h-7 py-[5px] leading-[18px]' : 'h-7 min-h-7 leading-7',
      )}
      onChange={(event) => onValueChange(event.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}

export function PromptBarControls({
  ariaLabel,
  canAttach,
  canSend,
  disabled,
  inputRef,
  loading,
  menuOpen,
  placeholder,
  plusOpen,
  sourcesLength,
  tall,
  value,
  onCloseMenu,
  onMenuNavigate,
  onMenuPick,
  onSend,
  onStop,
  onTogglePlusMenu,
  onValueChange,
}: {
  ariaLabel: string;
  canAttach: boolean;
  canSend: boolean;
  disabled: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  loading: boolean;
  menuOpen: boolean;
  placeholder: string;
  plusOpen: boolean;
  sourcesLength: number;
  tall: boolean;
  value: string;
  onCloseMenu: () => void;
  onMenuNavigate: (direction: 'ArrowDown' | 'ArrowUp') => void;
  onMenuPick: () => void;
  onSend: () => void;
  onStop?: () => void;
  onTogglePlusMenu: () => void;
  onValueChange: (value: string) => void;
}) {
  const gridAlignment = tall ? 'items-end' : 'items-center';

  return (
    <div className={cn('grid grid-cols-[28px_minmax(0,1fr)_28px] gap-x-1', gridAlignment)}>
      <PromptBarPlusButton
        canAttach={canAttach}
        disabled={disabled}
        loading={loading}
        plusOpen={plusOpen}
        onToggle={onTogglePlusMenu}
      />

      <PromptBarTextarea
        ariaLabel={ariaLabel}
        disabled={disabled}
        inputRef={inputRef}
        menuOpen={menuOpen}
        placeholder={placeholder}
        sourcesLength={sourcesLength}
        tall={tall}
        value={value}
        onCloseMenu={onCloseMenu}
        onMenuNavigate={onMenuNavigate}
        onMenuPick={onMenuPick}
        onSubmit={onSend}
        onValueChange={onValueChange}
      />

      <PromptBarSendButton
        canSend={canSend}
        disabled={disabled}
        loading={loading}
        onSend={onSend}
        onStop={onStop}
      />
    </div>
  );
}

export function PromptBarInputShell({
  children,
  disabled,
}: {
  children: ReactNode;
  disabled: boolean;
}) {
  return (
    <div
      className={cn(
        'border-border/70 bg-card relative isolate flex flex-col overflow-hidden rounded-full border',
        'gap-1 p-1 transition-[border-color,box-shadow] duration-150',
        'shadow-[0_1px_2px_oklch(0_0_0/0.04),0_6px_20px_oklch(0_0_0/0.06)]',
        'focus-within:border-foreground/20',
        disabled && 'opacity-60',
      )}
    >
      {children}
    </div>
  );
}
