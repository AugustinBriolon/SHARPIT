'use client';

import { ArrowUpRight } from 'lucide-react';
import { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';
import { coachBeuiTheme } from '@/components/coach/beui/coach-beui-theme';
import { COACH_CHAT_SUGGESTIONS } from '@/lib/coach/chat/coach-chat-known-sessions';
import { cn } from '@/lib/utils';

/**
 * Empty Chat — quiet instrument starters (not pill twins of the Prompt Bar).
 * Hairline list + arrow, gravity toward the composer.
 */
export function CoachChatEmptyState({
  disabled = false,
  onSuggestionClick,
}: {
  disabled?: boolean;
  onSuggestionClick?: (text: string) => void;
}) {
  return (
    <div className={coachBeuiTheme.emptyState}>
      <p className="text-muted-foreground max-w-prose text-sm leading-relaxed text-pretty">
        {coachBeuiCopy.emptyHint}
      </p>
      <div
        aria-label={coachBeuiCopy.suggestionsAriaLabel}
        className="border-border/50 divide-border/40 w-full divide-y border-y"
        role="group"
      >
        {COACH_CHAT_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            disabled={disabled}
            type="button"
            className={cn(
              'group text-foreground/80 flex w-full items-start gap-2.5 py-3 text-left',
              'text-[13px] leading-snug transition-[background-color,color,transform] duration-150 ease-out',
              'active:scale-[0.99]',
              disabled
                ? 'opacity-60'
                : 'hover:bg-muted/50 hover:text-foreground active:bg-muted/60',
            )}
            onClick={onSuggestionClick ? () => onSuggestionClick(suggestion) : undefined}
          >
            <ArrowUpRight
              className="text-muted-foreground mt-0.5 size-3.5 shrink-0 opacity-70 transition-opacity group-hover:opacity-100"
              strokeWidth={1.8}
              aria-hidden
            />
            <span className="min-w-0 flex-1 text-pretty">{suggestion}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
