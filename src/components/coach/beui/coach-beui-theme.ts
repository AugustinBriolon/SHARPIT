import { cn } from '@/lib/utils';

/** Cap chrome motion at 300ms per DESIGN_LANGUAGE. */
export const COACH_BEUI_MOTION_MS = 300;

export const coachBeuiTheme = {
  /** Outer chat panel — unchanged SHARPIT shell. */
  panel:
    'rounded-analysis-lg relative flex h-full min-w-0 flex-1 flex-col overflow-hidden lg:border',

  /** MessageScroller viewport + content padding. */
  scrollerViewport: 'flex-1 min-h-0',
  scrollerContent: 'space-y-4 p-4 pt-40 lg:pt-4',

  /** Empty transcript — centered below header inset (no extra margin). */
  emptyState: 'flex min-h-[min(100%,28rem)] flex-col items-center justify-center gap-4 text-center',

  /** User bubble — ghost variant + SHARPIT accent surface. */
  userBubble: cn(
    'bg-accent text-foreground max-w-[85%] rounded-[18px_18px_4px_18px]',
    'px-4 py-2.5 text-sm leading-6 whitespace-pre-wrap',
  ),

  /** Assistant bubble — analysis surface + wider cap. */
  assistantBubble: cn(
    'bg-analysis-surface-alt text-foreground w-full max-w-[90%] min-w-0',
    'space-y-2 overflow-hidden rounded-[18px_18px_18px_4px] px-4 py-3',
  ),

  /** Submitted-state typing row (no shimmer). */
  typingBubble: cn('bg-analysis-surface-alt', 'rounded-[18px_18px_18px_4px] px-4 py-2.5'),

  /** Prompt input shell inside CoachComposerShell. */
  promptInput: cn(
    'border-0 bg-transparent p-0 shadow-none',
    'focus-within:border-transparent focus-within:ring-0',
  ),

  /** Jump-to-latest floating control. */
  jumpButton:
    'ring-border pointer-events-auto rounded-full p-2.5 size-9 shrink-0 shadow-none ring-1 bg-analysis-surface-alt',

  /** Pending approvals region. */
  approvalsRegion: 'space-y-2',
  approvalsHeading: 'text-muted-foreground flex items-center gap-1.5 px-0.5 text-xs',
  approvalsBadge:
    'bg-primary/10 text-primary inline-flex size-5 items-center justify-center rounded-full text-[10px] font-semibold',

  /** Agent activity inside assistant bubble. */
  agentActivity: 'w-full',
} as const;
