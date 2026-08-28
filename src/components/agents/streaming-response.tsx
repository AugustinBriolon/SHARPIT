'use client';
// beui.dev/components/agents/chat-app

import { Check, ChevronDown, Copy, RotateCcw, ThumbsDown, ThumbsUp } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';
import { type CitationItem, CitationList, CitationStack } from '@/components/agents/citations';
import { AgentDisclosure } from '@/components/agents/agent-disclosure';
import { EASE_OUT, SPRING_PRESS, SPRING_SWAP } from '@/lib/ease';
import { motionTokens } from '@/lib/motion/tokens';
import { cn } from '@/lib/utils';

export type StreamingResponseStatus = 'streaming' | 'complete' | 'error';
export type StreamingResponseFeedback = 'up' | 'down' | null;

export interface StreamingResponseProps {
  /** Rendered response content. Pass plain text or the output of a Markdown renderer. */
  children: ReactNode;
  status?: StreamingResponseStatus;
  /** Plain-text value copied by the built-in copy action. */
  copyText?: string;
  /** Overrides the built-in clipboard action. */
  onCopy?: () => void | Promise<void>;
  onRetry?: () => void;
  /** Optional sources shown as a compact footer disclosure after streaming. */
  sources?: CitationItem[];
  sourcesOpen?: boolean;
  defaultSourcesOpen?: boolean;
  onSourcesOpenChange?: (open: boolean) => void;
  sourceIdPrefix?: string;
  feedback?: StreamingResponseFeedback;
  defaultFeedback?: StreamingResponseFeedback;
  onFeedbackChange?: (feedback: StreamingResponseFeedback) => void;
  /** Set false when a surrounding conversation log announces streamed text. */
  announce?: boolean;
  /** Hides the built-in completion actions without changing response status. */
  showActions?: boolean;
  className?: string;
  contentClassName?: string;
  actionsClassName?: string;
}

function ResponseAction({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const reduce = useReducedMotion() ?? false;

  return (
    <motion.button
      aria-label={label}
      aria-pressed={label === 'Helpful' || label === 'Not helpful' ? active : undefined}
      title={label}
      transition={SPRING_PRESS}
      type="button"
      whileTap={reduce ? undefined : { scale: motionTokens.scale.pressMicro }}
      className={cn(
        'text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-7 place-items-center rounded-md transition-colors outline-none focus-visible:ring-2',
        active && 'bg-muted text-foreground',
      )}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

export function StreamingResponse({
  children,
  status = 'streaming',
  copyText,
  onCopy,
  onRetry,
  sources = [],
  sourcesOpen,
  defaultSourcesOpen = false,
  onSourcesOpenChange,
  sourceIdPrefix,
  feedback,
  defaultFeedback = null,
  onFeedbackChange,
  announce = true,
  showActions = true,
  className,
  contentClassName,
  actionsClassName,
}: StreamingResponseProps) {
  const reduce = useReducedMotion() ?? false;
  const baseId = useId();
  const [copied, setCopied] = useState(false);
  const [internalFeedback, setInternalFeedback] =
    useState<StreamingResponseFeedback>(defaultFeedback);
  const [internalSourcesOpen, setInternalSourcesOpen] = useState(defaultSourcesOpen);
  const copyTimer = useRef<number | undefined>(undefined);
  const currentFeedback = feedback ?? internalFeedback;
  const currentSourcesOpen = sourcesOpen ?? internalSourcesOpen;
  const streaming = status === 'streaming';
  const complete = status === 'complete';
  const canCopy = Boolean(copyText || onCopy);
  const hasSources = sources.length > 0;
  const shouldShowActions =
    showActions && !streaming && (canCopy || onRetry || complete || hasSources);
  const sourcesContentId = `${baseId}-sources`;
  const resolvedSourcePrefix = sourceIdPrefix ?? `response-source-${baseId.replace(/:/g, '')}`;

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  const handleCopy = useCallback(async () => {
    if (onCopy) await onCopy();
    else if (copyText) await navigator.clipboard?.writeText(copyText);

    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
  }, [copyText, onCopy]);

  const setFeedback = (next: Exclude<StreamingResponseFeedback, null>) => {
    const value = currentFeedback === next ? null : next;
    if (feedback === undefined) setInternalFeedback(value);
    onFeedbackChange?.(value);
  };

  const setSourcesOpen = useCallback(
    (next: boolean) => {
      if (sourcesOpen === undefined) setInternalSourcesOpen(next);
      onSourcesOpenChange?.(next);
    },
    [onSourcesOpenChange, sourcesOpen],
  );

  return (
    <div aria-busy={streaming} className={cn('w-full', className)} data-state={status}>
      <div
        aria-live={announce ? 'polite' : 'off'}
        className={cn(
          'text-foreground/90 [&_code]:bg-muted [&_pre]:border-border [&_pre]:bg-muted/45 text-sm leading-6 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p+p]:mt-3 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5',
          contentClassName,
        )}
      >
        {children}
      </div>

      <AnimatePresence initial={false}>
        {shouldShowActions ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mt-3"
            exit={{ opacity: 0 }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
            transition={{ duration: reduce ? 0.12 : 0.22, ease: EASE_OUT }}
          >
            <div className={cn('flex items-center gap-0.5', actionsClassName)}>
              {canCopy ? (
                <ResponseAction label={copied ? 'Copied' : 'Copy response'} onClick={handleCopy}>
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                </ResponseAction>
              ) : null}
              {onRetry ? (
                <ResponseAction label="Retry response" onClick={onRetry}>
                  <RotateCcw className="size-3.5" />
                </ResponseAction>
              ) : null}
              {complete ? (
                <>
                  <ResponseAction
                    active={currentFeedback === 'up'}
                    label="Helpful"
                    onClick={() => setFeedback('up')}
                  >
                    <ThumbsUp className="size-3.5" />
                  </ResponseAction>
                  <ResponseAction
                    active={currentFeedback === 'down'}
                    label="Not helpful"
                    onClick={() => setFeedback('down')}
                  >
                    <ThumbsDown className="size-3.5" />
                  </ResponseAction>
                </>
              ) : null}
              {hasSources ? (
                <button
                  aria-controls={sourcesContentId}
                  aria-expanded={currentSourcesOpen}
                  className="group text-muted-foreground hover:text-foreground focus-visible:ring-ring ml-1 inline-flex min-h-7 items-center gap-2 rounded-md px-1.5 text-xs transition-colors outline-none focus-visible:ring-2"
                  type="button"
                  onClick={() => setSourcesOpen(!currentSourcesOpen)}
                >
                  <CitationStack citations={sources} />
                  <span className="tabular-nums">
                    {sources.length} {sources.length === 1 ? 'source' : 'sources'}
                  </span>
                  <motion.span
                    animate={{ rotate: currentSourcesOpen ? 180 : 0 }}
                    aria-hidden="true"
                    className="text-muted-foreground/50 group-hover:text-muted-foreground"
                    transition={reduce ? { duration: 0 } : SPRING_SWAP}
                  >
                    <ChevronDown className="size-3" />
                  </motion.span>
                </button>
              ) : null}
            </div>

            {hasSources ? (
              <AgentDisclosure id={sourcesContentId} open={currentSourcesOpen}>
                <CitationList
                  citations={sources}
                  className="bg-muted mt-2 rounded-xl p-2"
                  idPrefix={resolvedSourcePrefix}
                />
              </AgentDisclosure>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
