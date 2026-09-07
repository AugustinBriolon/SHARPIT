import { cn } from '@/lib/utils';
import { PAGE_CONTENT_MAX_CLASS } from '@/lib/ui/page-gutter';

/** Cap chrome motion at 300ms per DESIGN_LANGUAGE. */
export const COACH_BEUI_MOTION_MS = 300;

/** Same reading column as AppShell — immersive chat re-applies it (fixed layout escapes main). */
export const COACH_COLUMN_CLASS = cn('mx-auto w-full', PAGE_CONTENT_MAX_CLASS);

export const coachBeuiTheme = {
  /** Full-bleed viewport shell; inner column uses `COACH_COLUMN_CLASS`. */
  panel: 'relative flex h-full min-w-0 flex-1 flex-col overflow-hidden',
  column: COACH_COLUMN_CLASS,

  /** MessageScroller viewport + content padding (header clearance). */
  scrollerViewport: 'flex-1 min-h-0',
  /** `min-h-full` + flex column lets empty state `mt-auto` pin to the composer. */
  scrollerContent:
    'mx-auto flex min-h-full w-full flex-col space-y-4 px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3',

  /**
   * Empty transcript — chat-app gravity toward the composer.
   * Starters are a hairline list (not full-width pill cards).
   */
  emptyState: 'mt-auto flex w-full flex-col items-stretch gap-4 pb-1 text-left',

  /** User bubble — ghost variant + SHARPIT accent surface. */
  userBubble: cn(
    'bg-accent text-foreground max-w-[min(85%,28rem)] rounded-[18px_18px_4px_18px]',
    'px-4 py-2.5 text-sm leading-6 whitespace-pre-wrap',
  ),

  /**
   * Assistant column — unbubbled narrative within the reading column.
   */
  assistantColumn: cn('flex w-full max-w-2xl min-w-0 flex-col gap-2.5'),
  assistantProse: cn('text-foreground min-w-0 text-sm leading-relaxed'),

  /** Instrument table / metric block — separate from prose. */
  instrumentBlock: cn(
    'border-analysis-border bg-analysis-surface/60 rounded-analysis min-w-0 overflow-x-auto border',
  ),
  instrumentTable: 'w-full min-w-[18rem] border-collapse text-xs',
  instrumentTh: cn(
    'border-analysis-border/70 text-label border-b px-2.5 py-2 text-left break-words',
  ),
  instrumentTd: cn(
    'border-analysis-border/40 text-foreground border-t px-2.5 py-2 align-top break-words tabular-nums',
  ),

  /** Submitted-state typing row (no shimmer). */
  typingBubble: cn('text-muted-foreground max-w-2xl py-1'),

  /** Prompt input shell inside CoachComposerShell. */
  promptInput: cn(
    'border-0 bg-transparent p-0 shadow-none',
    'focus-within:border-transparent focus-within:ring-0',
  ),

  /** Jump-to-latest floating control. */
  jumpButton:
    'ring-border pointer-events-auto rounded-full p-2.5 size-9 shrink-0 shadow-none ring-1 bg-analysis-surface-alt',

  /** Pending approvals region — compact BEUI-style question strip. */
  approvalsRegion: 'space-y-1.5 max-w-2xl',
  approvalsHeading:
    'text-muted-foreground flex items-center gap-1.5 px-0.5 text-[11px] font-medium',
  approvalsBadge:
    'bg-primary/10 text-primary inline-flex size-[18px] items-center justify-center rounded-full text-[10px] font-semibold tabular-nums',

  /** Agent activity under the answer (tool chips / task rows). */
  agentActivity: 'w-full max-w-2xl',
  toolChip: cn(
    'bg-muted/70 text-muted-foreground ring-border/50',
    'inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
  ),
} as const;
