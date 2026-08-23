'use client';

import Link from 'next/link';
import { Paperclip, X } from 'lucide-react';
import type { CoachDiscussContext } from '@/lib/coach/chat/coach-discuss-context';

/**
 * Names the context a contextual conversation carries, and lets the athlete
 * drop it before sending.
 *
 * The Coach may inform a decision; it never silently acts on one. An athlete
 * who cannot see what the conversation carries cannot judge the answer, so the
 * attachment is stated rather than left implicit in the prefilled message.
 */
export function CoachContextChip({
  context,
  onDetach,
}: {
  context: CoachDiscussContext;
  onDetach: () => void;
}) {
  return (
    <div className="border-border/60 flex items-center gap-2 border-t px-3 pt-2.5">
      <span className="bg-highlight/40 text-foreground rounded-analysis flex min-w-0 items-center gap-1.5 px-2 py-1 text-xs font-medium">
        <Paperclip className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{context.label}</span>
      </span>
      <Link
        className="text-muted-foreground hover:text-foreground shrink-0 text-xs underline underline-offset-2"
        href={context.sourceHref}
      >
        Revoir
      </Link>
      <button
        aria-label={`Retirer le contexte · ${context.label}`}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring ml-auto shrink-0 rounded-full p-1 focus-visible:ring-2 focus-visible:outline-hidden"
        type="button"
        onClick={onDetach}
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
