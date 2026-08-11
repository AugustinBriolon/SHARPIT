'use client';

import { useEffect, useRef, useState } from 'react';
import { Brain, ChevronRight } from 'lucide-react';
import { MotionExpand } from '@/components/motion';
import { reasoningSummaryLabel, shouldAutoExpandReasoning } from '@/lib/coach/coach-reasoning';
import { cn } from '@/lib/utils';

/**
 * Live view on the model's deliberation.
 *
 * Reasoning is the first content the coach produces — surfacing it is what
 * turns a long silent wait into a response that starts immediately. It opens
 * itself while it is the only thing streaming, then folds away behind a summary
 * line once the answer takes over. The athlete can re-open it at any time.
 */
export function CoachReasoning({
  text,
  streaming,
  hasAnswerText,
}: {
  text: string;
  streaming: boolean;
  hasAnswerText: boolean;
}) {
  const autoExpanded = shouldAutoExpandReasoning({ streaming, hasAnswerText });
  const [manuallyToggled, setManuallyToggled] = useState<boolean | null>(null);
  const open = manuallyToggled ?? autoExpanded;
  const bodyRef = useRef<HTMLDivElement>(null);

  // Keep the newest reasoning in view inside the panel, never the page.
  useEffect(() => {
    if (!open || !streaming) return;
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [text, open, streaming]);

  if (!text.trim()) return null;

  return (
    <div className="border-analysis-border/60 bg-background/40 rounded-analysis border">
      <button
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 px-2.5 py-2 text-left text-xs transition-colors"
        type="button"
        onClick={() => setManuallyToggled(!open)}
      >
        <Brain
          className={cn('size-3.5 shrink-0', streaming && !hasAnswerText && 'animate-pulse')}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate font-medium">
          {reasoningSummaryLabel({ streaming, hasAnswerText })}
        </span>
        <ChevronRight
          className={cn(
            'size-3.5 shrink-0 transition-transform duration-150 ease-out',
            open && 'rotate-90',
          )}
          aria-hidden
        />
      </button>
      <MotionExpand open={open}>
        <div
          ref={bodyRef}
          className="text-muted-foreground max-h-56 overflow-y-auto px-2.5 pb-2.5 text-xs leading-relaxed whitespace-pre-wrap"
        >
          {text}
        </div>
      </MotionExpand>
    </div>
  );
}
