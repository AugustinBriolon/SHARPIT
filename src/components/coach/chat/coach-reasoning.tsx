'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { MotionExpand } from '@/components/motion';
import {
  reasoningSummaryLabel,
  shouldAutoExpandReasoning,
  splitReasoningSentences,
} from '@/lib/coach/chat/coach-reasoning';
import { cn } from '@/lib/utils';

const MAX_VIEWPORT_H = 180;

type FadeEdge = 'none' | 'top' | 'bottom' | 'both';

function resolveFade(el: HTMLDivElement | null): FadeEdge {
  if (!el) return 'none';
  const top = el.scrollTop > 2;
  const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
  if (top && bottom) return 'both';
  if (top) return 'top';
  if (bottom) return 'bottom';
  return 'none';
}

/**
 * Reasoning trace — Beautiful UI style.
 *
 * Reasoning is the first content the coach produces — surfacing a summary line
 * turns a long silent wait into a response that starts immediately. Sentences
 * reveal one-by-one while the coach thinks, then collapse to a summary the
 * athlete can reopen at any time. A viewport with gradient fades keeps the
 * block compact.
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
  const viewportRef = useRef<HTMLDivElement>(null);

  const thinkingStartRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);
  const [fade, setFade] = useState<FadeEdge>('none');

  const isThinking = streaming && !hasAnswerText;

  useEffect(() => {
    if (isThinking) {
      if (thinkingStartRef.current == null) thinkingStartRef.current = Date.now();
    } else if (thinkingStartRef.current != null && elapsedSeconds == null) {
      setElapsedSeconds(Math.max(1, Math.round((Date.now() - thinkingStartRef.current) / 1000)));
    }
  }, [isThinking, elapsedSeconds]);

  useEffect(() => {
    if (!open || !streaming) return;
    const el = viewportRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      setFade(resolveFade(el));
    }
  }, [text, open, streaming]);

  const onScroll = useCallback(() => {
    setFade(resolveFade(viewportRef.current));
  }, []);

  const sentences = splitReasoningSentences(text);
  if (sentences.length === 0) return null;

  const needsScroll = sentences.length > 4;

  return (
    <div className="space-y-0">
      <button
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground group flex w-full items-center gap-1.5 py-1.5 text-left text-xs transition-colors"
        type="button"
        onClick={() => setManuallyToggled(!open)}
      >
        {isThinking ? (
          <span className="coach-orb shrink-0" aria-hidden />
        ) : (
          <ChevronRight
            className={cn(
              'size-3 shrink-0 transition-transform duration-200 ease-out',
              open && 'rotate-90',
            )}
            aria-hidden
          />
        )}
        <span
          className={cn(
            'min-w-0 flex-1 truncate font-medium',
            isThinking && 'coach-thinking-shimmer',
          )}
        >
          {reasoningSummaryLabel({ streaming, hasAnswerText, elapsedSeconds })}
        </span>
      </button>

      <MotionExpand open={open}>
        <div
          ref={viewportRef}
          className={cn('overflow-y-auto pb-1 pl-4.5', needsScroll && 'coach-reasoning-viewport')}
          data-fade={needsScroll ? fade : 'none'}
          style={{ maxHeight: `${MAX_VIEWPORT_H}px` }}
          onScroll={needsScroll ? onScroll : undefined}
        >
          <div className="space-y-1">
            {sentences.map((sentence, i) => (
              <p
                key={`${i}-${sentence.slice(0, 20)}`}
                className="coach-reasoning-sentence text-muted-foreground text-xs leading-relaxed"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {sentence}
              </p>
            ))}
          </div>
        </div>
      </MotionExpand>
    </div>
  );
}
