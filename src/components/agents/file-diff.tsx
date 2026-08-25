'use client';
// beui.dev/components/agents/chat-app

import { Check, ChevronDown, Copy, FileCode2, LoaderCircle } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  type AgentCodeLanguage,
  AgentCodeLine,
  useAgentCodeTokens,
} from '@/components/agents/agent-code';
import { AgentDisclosure } from '@/components/agents/agent-disclosure';
import { SPRING_PRESS, SPRING_SWAP } from '@/lib/ease';
import { cn } from '@/lib/utils';

function diffLinePrefix(type?: FileDiffLineType): string {
  if (type === 'added') return '+';
  if (type === 'removed') return '−';
  return '';
}

export type FileDiffStatus = 'streaming' | 'complete';
export type FileDiffLineType = 'added' | 'removed' | 'context';

export interface FileDiffLine {
  id: string;
  type?: FileDiffLineType;
  oldLine?: number;
  newLine?: number;
  content: string;
}

export interface FileDiffProps {
  file: ReactNode;
  lines: FileDiffLine[];
  status?: FileDiffStatus;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  collapseOnComplete?: boolean;
  maxHeight?: number;
  language?: AgentCodeLanguage;
  copyText?: string;
  onCopy?: () => void | Promise<void>;
  className?: string;
}

function ChangeCount({ value, type }: { value: number; type: 'added' | 'removed' }) {
  if (!value) return null;
  return (
    <span
      className={cn(
        'font-mono text-xs tabular-nums',
        type === 'added'
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-rose-600 dark:text-rose-400',
      )}
    >
      {type === 'added' ? '+' : '−'}
      {value}
    </span>
  );
}

export function FileDiff({
  file,
  lines,
  status = 'streaming',
  open,
  defaultOpen = true,
  onOpenChange,
  collapseOnComplete = true,
  maxHeight = 220,
  language = 'typescript',
  copyText,
  onCopy,
  className,
}: FileDiffProps) {
  const reduce = useReducedMotion() ?? false;
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const contentId = `${baseId}-content`;
  const viewportRef = useRef<HTMLDivElement>(null);
  const previousStatus = useRef(status);
  const copyTimer = useRef<number | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const currentOpen = open ?? internalOpen;
  const streaming = status === 'streaming';
  const additions = lines.filter((line) => line.type === 'added').length;
  const deletions = lines.filter((line) => line.type === 'removed').length;
  const canCopy = Boolean(copyText || onCopy);
  const code = lines.map((line) => line.content).join('\n');
  const tokens = useAgentCodeTokens(code, language);

  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange, open],
  );

  useEffect(() => {
    if (previousStatus.current !== 'streaming' && status === 'streaming') {
      setOpen(true);
    }
    if (previousStatus.current === 'streaming' && status === 'complete' && collapseOnComplete) {
      setOpen(false);
    }
    previousStatus.current = status;
  }, [collapseOnComplete, setOpen, status]);

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !currentOpen || !streaming) return;

    const frame = requestAnimationFrame(() => {
      if (viewport.scrollHeight <= viewport.clientHeight) return;
      if (typeof viewport.scrollTo === 'function') {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: reduce ? 'auto' : 'smooth',
        });
      } else {
        viewport.scrollTop = viewport.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(frame);
  });

  const handleCopy = useCallback(async () => {
    if (onCopy) await onCopy();
    else if (copyText) await navigator.clipboard?.writeText(copyText);

    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
  }, [copyText, onCopy]);

  return (
    <div aria-busy={streaming} className={cn('w-full text-sm', className)} data-state={status}>
      <button
        aria-controls={contentId}
        aria-expanded={currentOpen}
        className="group focus-visible:ring-ring focus-visible:ring-offset-background flex min-h-9 w-full items-center gap-2 rounded-md py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        id={triggerId}
        type="button"
        onClick={() => setOpen(!currentOpen)}
      >
        <FileCode2 aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
        <span className="text-foreground/80 min-w-0 flex-1 truncate font-mono text-xs">{file}</span>
        <span className="flex shrink-0 items-center gap-2">
          <ChangeCount type="added" value={additions} />
          <ChangeCount type="removed" value={deletions} />
        </span>
        <span className="text-muted-foreground/60 grid size-4 shrink-0 place-items-center">
          {streaming ? (
            <LoaderCircle
              aria-label="Applying changes"
              className={cn('size-3.5', !reduce && 'animate-spin')}
            />
          ) : (
            <Check aria-label="Changes applied" className="size-3.5" />
          )}
        </span>
        <motion.span
          animate={{ rotate: currentOpen ? 180 : 0 }}
          aria-hidden="true"
          className="text-muted-foreground/45 group-hover:text-muted-foreground shrink-0 transition-colors"
          transition={reduce ? { duration: 0 } : SPRING_SWAP}
        >
          <ChevronDown className="size-3.5" />
        </motion.span>
      </button>

      <AgentDisclosure aria-labelledby={triggerId} id={contentId} open={currentOpen} role="region">
        <div className="pt-1.5 pl-6">
          <div className="bg-muted/80 overflow-hidden rounded-xl">
            <div
              ref={viewportRef}
              aria-live="polite"
              className="scrollbar-hide overflow-auto"
              data-slot="file-diff-viewport"
              style={{ maxHeight }}
            >
              <div className="font-mono text-xs leading-5">
                <span className="sr-only">File changes</span>
                {lines.map((line, index) => {
                  const type = line.type ?? 'context';
                  return (
                    <div
                      key={line.id}
                      className={cn(
                        'grid grid-cols-[2.25rem_2.25rem_1rem_minmax(0,1fr)]',
                        type === 'added' && 'bg-emerald-500/[0.07]',
                        type === 'removed' && 'bg-rose-500/[0.07]',
                      )}
                    >
                      <span className="text-muted-foreground/40 pr-2 text-right tabular-nums select-none">
                        {line.oldLine}
                      </span>
                      <span className="text-muted-foreground/40 pr-2 text-right tabular-nums select-none">
                        {line.newLine}
                      </span>
                      <span
                        className={cn(
                          'text-muted-foreground/45 text-center select-none',
                          type === 'added' && 'text-emerald-600 dark:text-emerald-400',
                          type === 'removed' && 'text-rose-600 dark:text-rose-400',
                        )}
                      >
                        {diffLinePrefix(type)}
                      </span>
                      <AgentCodeLine
                        className="min-w-0 px-1.5 whitespace-pre"
                        code={line.content}
                        tokens={tokens?.[index]}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {canCopy ? (
              <div className="flex justify-end px-2 pt-1 pb-1.5">
                <motion.button
                  aria-label={copied ? 'Copied' : 'Copy diff'}
                  className="text-muted-foreground hover:bg-background/70 hover:text-foreground focus-visible:ring-ring grid size-7 place-items-center rounded-md transition-colors outline-none focus-visible:ring-2"
                  title={copied ? 'Copied' : 'Copy diff'}
                  transition={SPRING_PRESS}
                  type="button"
                  whileTap={reduce ? undefined : { scale: 0.9 }}
                  onClick={handleCopy}
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                </motion.button>
              </div>
            ) : null}
          </div>
        </div>
      </AgentDisclosure>
    </div>
  );
}
