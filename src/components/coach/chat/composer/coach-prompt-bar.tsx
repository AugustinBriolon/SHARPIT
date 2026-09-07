'use client';

/**
 * Coach Prompt Bar — Beautiful UI Prompt Bar layout/UX, adapted to SHARPIT.
 * No model picker, no dictation, no glimm demo. Sources = attachable coach contexts.
 * Reference: https://www.beautifului.dev/ (Prompt Bar · Rounded)
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Activity, CalendarDays, Gauge, HeartPulse, StickyNote, Sun, Target } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { getNextMenuActiveIndex } from '@/components/coach/chat/composer/coach-prompt-bar-keyboard';
import {
  PromptBarChips,
  PromptBarControls,
  PromptBarInputShell,
  SourcesMenu,
  type SourceRow,
} from '@/components/coach/chat/composer/coach-prompt-bar-parts';
import { buildCoachContextPresets } from '@/lib/coach/chat/discuss/coach-context-presets';
import { describeCoachDiscussContext } from '@/lib/coach/chat/discuss/coach-discuss-context';
import type { CoachDiscussContext } from '@/lib/coach/chat/discuss/coach-discuss-context';
import { useActivities, useGoals } from '@/hooks/use-data';
import { usePhysicalNotes } from '@/hooks/use-physical';

function iconForKind(kind: CoachDiscussContext['kind']) {
  const className = 'size-[15px]';
  switch (kind) {
    case 'today':
      return <Sun className={className} strokeWidth={1.8} aria-hidden />;
    case 'activity':
      return <Activity className={className} strokeWidth={1.8} aria-hidden />;
    case 'planned-session':
    case 'planning':
      return <CalendarDays className={className} strokeWidth={1.8} aria-hidden />;
    case 'goal':
      return <Target className={className} strokeWidth={1.8} aria-hidden />;
    case 'record':
      return <Gauge className={className} strokeWidth={1.8} aria-hidden />;
    case 'physical-condition':
      return <HeartPulse className={className} strokeWidth={1.8} aria-hidden />;
    default:
      return <StickyNote className={className} strokeWidth={1.8} aria-hidden />;
  }
}

function useSourceRows(): SourceRow[] {
  const activitiesQuery = useActivities();
  const goalsQuery = useGoals();
  const notesQuery = usePhysicalNotes();

  return useMemo(() => {
    const presets = buildCoachContextPresets(activitiesQuery.data ?? [])
      .filter((p) => p.available && p.context)
      .map((p) => {
        const descById: Record<string, string> = {
          today: 'Snapshot du jour',
          'last-activity': 'Dernière activité synchronisée',
          'form-7d': 'Charge & récupération récente',
          week: 'Plan des 7 prochains jours',
        };
        return {
          key: p.id,
          name: p.label,
          desc: descById[p.id] ?? p.context!.kind,
          context: p.context!,
          icon: iconForKind(p.context!.kind),
        };
      });

    const goals = (goalsQuery.data ?? []).slice(0, 6).map((goal) => {
      const context = describeCoachDiscussContext(
        { kind: 'goal', goalId: goal.id },
        goal.title?.trim() || null,
      );
      return {
        key: `goal:${goal.id}`,
        name: context.label,
        desc: 'Objectif',
        context,
        icon: iconForKind('goal'),
      };
    });

    const notes = (notesQuery.data ?? [])
      .filter((n) => n.status === 'ACTIVE')
      .slice(0, 8)
      .map((note) => {
        const context = describeCoachDiscussContext(
          { kind: 'physical-condition', noteId: note.id },
          note.title?.trim() || null,
        );
        return {
          key: `condition:${note.id}`,
          name: context.label,
          desc: 'Condition physique',
          context,
          icon: iconForKind('physical-condition'),
        };
      });

    return [...presets, ...goals, ...notes];
  }, [activitiesQuery.data, goalsQuery.data, notesQuery.data]);
}

function useCloseMenuOnOutsideClick(plusOpen: boolean, closeMenu: () => void) {
  useEffect(() => {
    if (!plusOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target as Element).closest('[data-coach-promptbar]')) {
        closeMenu();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [closeMenu, plusOpen]);
}

function usePromptBarMenu({
  canAttach,
  inputRef,
  onAttachContext,
  sources,
}: {
  canAttach: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onAttachContext?: (context: CoachDiscussContext) => void;
  sources: SourceRow[];
}) {
  const [plusOpen, setPlusOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [engaged, setEngaged] = useState(false);
  const menuOpen = plusOpen && canAttach;

  const closeMenu = useCallback(() => {
    setPlusOpen(false);
  }, []);

  useEffect(() => {
    setActive(0);
    setEngaged(false);
  }, [plusOpen, sources.length]);

  useCloseMenuOnOutsideClick(plusOpen, closeMenu);

  const pick = useCallback(
    (row: SourceRow) => {
      onAttachContext?.(row.context);
      closeMenu();
      inputRef.current?.focus();
    },
    [closeMenu, inputRef, onAttachContext],
  );

  const handleMenuNavigate = useCallback(
    (direction: 'ArrowDown' | 'ArrowUp') => {
      setEngaged(true);
      setActive((current) => getNextMenuActiveIndex(current, direction, sources.length));
    },
    [sources.length],
  );

  const handleMenuPick = useCallback(() => {
    pick(sources[active]!);
  }, [active, pick, sources]);

  const togglePlusMenu = useCallback(() => {
    setPlusOpen((current) => !current);
    inputRef.current?.focus();
  }, [inputRef]);

  return {
    active,
    engaged,
    menuOpen,
    pick,
    closeMenu,
    handleMenuNavigate,
    handleMenuPick,
    plusOpen,
    setActive,
    setEngagedFalse: () => setEngaged(false),
    setEngagedTrue: () => setEngaged(true),
    togglePlusMenu,
  };
}

function useTextareaAutoHeight(
  inputRef: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
) {
  const [tall, setTall] = useState(false);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) {
      return;
    }
    const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
    const minHeight = narrow ? 36 : 28;
    const maxHeight = narrow ? 120 : 100;
    input.style.height = '0px';
    const contentHeight = input.scrollHeight;
    const next = Math.min(Math.max(contentHeight, minHeight), maxHeight);
    input.style.height = `${next}px`;
    input.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden';
    setTall(next > minHeight || value.includes('\n'));
  }, [inputRef, value]);

  return tall;
}

function canSendPrompt(value: string, disabled: boolean, loading: boolean): boolean {
  if (disabled || loading) {
    return false;
  }
  return value.trim().length > 0;
}

function usePromptBarSubmit({
  canSend,
  closeMenu,
  onSubmit,
  value,
}: {
  canSend: boolean;
  closeMenu: () => void;
  onSubmit: (value: string) => void;
  value: string;
}) {
  return useCallback(() => {
    if (!canSend) {
      return;
    }
    onSubmit(value.trim());
    closeMenu();
  }, [canSend, closeMenu, onSubmit, value]);
}

export type CoachPromptBarProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onStop?: () => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  attachedContext?: CoachDiscussContext | null;
  onAttachContext?: (context: CoachDiscussContext) => void;
  onDetachContext?: () => void;
  /** Extra chips above the controls (budget warnings, etc.). */
  leadingChips?: ReactNode;
};

export function CoachPromptBar({
  value,
  onValueChange,
  onSubmit,
  onStop,
  loading = false,
  disabled = false,
  placeholder = 'Écris un message…',
  ariaLabel = 'Message au coach',
  attachedContext = null,
  onAttachContext,
  onDetachContext,
  leadingChips,
}: CoachPromptBarProps) {
  const sources = useSourceRows();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const canAttach = Boolean(onAttachContext);
  const canSend = canSendPrompt(value, disabled, loading);
  const tall = useTextareaAutoHeight(inputRef, value);
  const menu = usePromptBarMenu({ canAttach, inputRef, onAttachContext, sources });
  const send = usePromptBarSubmit({ canSend, closeMenu: menu.closeMenu, onSubmit, value });

  const handleValueChange = useCallback(
    (nextValue: string) => {
      onValueChange(nextValue);
      menu.closeMenu();
    },
    [menu, onValueChange],
  );

  return (
    <div className="relative w-full space-y-1.5" data-coach-promptbar>
      <AnimatePresence>
        {menu.menuOpen ? (
          <SourcesMenu
            key="sources-menu"
            active={menu.active}
            engaged={menu.engaged}
            rows={sources}
            onActiveChange={menu.setActive}
            onDisengage={menu.setEngagedFalse}
            onEngage={menu.setEngagedTrue}
            onPick={menu.pick}
          />
        ) : null}
      </AnimatePresence>

      <PromptBarChips
        attachedContext={attachedContext}
        leadingChips={leadingChips}
        onDetachContext={onDetachContext}
      />

      <PromptBarInputShell disabled={disabled}>
        <PromptBarControls
          ariaLabel={ariaLabel}
          canAttach={canAttach}
          canSend={canSend}
          disabled={disabled}
          inputRef={inputRef}
          loading={loading}
          menuOpen={menu.menuOpen}
          placeholder={placeholder}
          plusOpen={menu.plusOpen}
          sourcesLength={sources.length}
          tall={tall}
          value={value}
          onCloseMenu={menu.closeMenu}
          onMenuNavigate={menu.handleMenuNavigate}
          onMenuPick={menu.handleMenuPick}
          onSend={send}
          onStop={onStop}
          onTogglePlusMenu={menu.togglePlusMenu}
          onValueChange={handleValueChange}
        />
      </PromptBarInputShell>
    </div>
  );
}
