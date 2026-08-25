'use client';

import { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';
import { coachBeuiTheme } from '@/components/coach/beui/coach-beui-theme';
import { COACH_CHAT_SUGGESTIONS } from '@/lib/coach/chat/coach-chat-known-sessions';
import { cn } from '@/lib/utils';

export function CoachChatEmptyState({
  disabled = false,
  onSuggestionClick,
}: {
  disabled?: boolean;
  onSuggestionClick?: (text: string) => void;
}) {
  return (
    <div className={coachBeuiTheme.emptyState}>
      <p className="text-muted-foreground max-w-sm text-sm">{coachBeuiCopy.emptyHint}</p>
      <div
        aria-label={coachBeuiCopy.suggestionsAriaLabel}
        className="flex flex-wrap justify-center gap-2"
        role="group"
      >
        {COACH_CHAT_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            disabled={disabled}
            type="button"
            className={cn(
              'chip-surface text-foreground/80 min-h-11 rounded-full px-3 py-1.5 text-xs lg:min-h-9',
              disabled
                ? 'opacity-70'
                : 'hover:border-primary/40 hover:text-foreground transition-colors',
            )}
            onClick={onSuggestionClick ? () => onSuggestionClick(suggestion) : undefined}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
