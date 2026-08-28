'use client';
// beui.dev/components/agents/chat-app

import { Check, Copy, FileCode2, LoaderCircle } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type AgentCodeLanguage,
  AgentCodeLine,
  useAgentCodeTokens,
} from '@/components/agents/agent-code';
import { SPRING_PRESS } from '@/lib/ease';
import { cn } from '@/lib/utils';

export type CodeBlockStatus = 'streaming' | 'complete';

export interface CodeBlockProps {
  code: string;
  language?: AgentCodeLanguage;
  filename?: ReactNode;
  status?: CodeBlockStatus;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  maxHeight?: number;
  wrap?: boolean;
  copyable?: boolean;
  onCopy?: () => void | Promise<void>;
  className?: string;
}

function buildCodeLines(code: string) {
  let offset = 0;
  return code.split('\n').map((content) => {
    const line = { content, offset };
    offset += content.length + 1;
    return line;
  });
}

function CodeBlockStatusBadge({ streaming, reduce }: { streaming: boolean; reduce: boolean }) {
  return (
    <span
      className={cn(
        'ml-auto inline-flex shrink-0 items-center gap-1 text-[10px] font-medium',
        streaming ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400',
      )}
    >
      {streaming ? (
        <LoaderCircle className={cn('size-3', !reduce && 'animate-spin')} />
      ) : (
        <Check className="size-3" />
      )}
      {streaming ? 'Writing' : 'Ready'}
    </span>
  );
}

function CodeBlockCopyButton({
  copied,
  reduce,
  onCopyClick,
}: {
  copied: boolean;
  reduce: boolean;
  onCopyClick: () => void;
}) {
  return (
    <motion.button
      aria-label={copied ? 'Copied' : 'Copy code'}
      className="text-muted-foreground hover:bg-background/70 hover:text-foreground focus-visible:ring-ring grid size-7 shrink-0 place-items-center rounded-full transition-colors outline-none focus-visible:ring-2"
      title={copied ? 'Copied' : 'Copy code'}
      transition={SPRING_PRESS}
      type="button"
      whileTap={reduce ? undefined : { scale: 0.9 }}
      onClick={onCopyClick}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </motion.button>
  );
}

function CodeBlockHeader({
  filename,
  language,
  streaming,
  reduce,
  copied,
  copyable,
  onCopy,
  onCopyClick,
}: {
  filename?: ReactNode;
  language: AgentCodeLanguage;
  streaming: boolean;
  reduce: boolean;
  copied: boolean;
  copyable: boolean;
  onCopy?: () => void | Promise<void>;
  onCopyClick: () => void;
}) {
  return (
    <div className="flex h-10 items-center gap-2.5 px-3">
      <FileCode2 aria-hidden="true" className="text-muted-foreground/70 size-3.5 shrink-0" />
      {filename ? (
        <span className="text-foreground/80 min-w-0 truncate font-mono text-xs">{filename}</span>
      ) : null}
      <span className="text-muted-foreground/55 text-[10px] font-medium tracking-wide uppercase">
        {language}
      </span>
      <CodeBlockStatusBadge reduce={reduce} streaming={streaming} />
      {copyable || onCopy ? (
        <CodeBlockCopyButton copied={copied} reduce={reduce} onCopyClick={onCopyClick} />
      ) : null}
    </div>
  );
}

function CodeBlockLineRow({
  line,
  lineNumber,
  showLineNumbers,
  highlighted,
  tokens,
  wrap,
}: {
  line: { content: string; offset: number };
  lineNumber: number;
  showLineNumbers: boolean;
  highlighted: Set<number>;
  tokens: ReturnType<typeof useAgentCodeTokens>;
  wrap: boolean;
}) {
  return (
    <span
      className={cn(
        'grid min-h-5',
        showLineNumbers ? 'grid-cols-[2.75rem_minmax(0,1fr)]' : 'grid-cols-1',
        highlighted.has(lineNumber) && 'bg-blue-500/[0.07]',
      )}
    >
      {showLineNumbers ? (
        <span className="text-muted-foreground/35 pr-3 text-right tabular-nums select-none">
          {lineNumber}
        </span>
      ) : null}
      <AgentCodeLine
        code={line.content}
        tokens={tokens?.[lineNumber - 1]}
        className={cn(
          'pr-4',
          showLineNumbers ? 'pl-1' : 'pl-4',
          wrap ? 'break-words whitespace-pre-wrap' : 'whitespace-pre',
        )}
      />
    </span>
  );
}

function CodeBlockViewport({
  viewportRef,
  streaming,
  maxHeight,
  lines,
  showLineNumbers,
  highlighted,
  tokens,
  wrap,
}: {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  streaming: boolean;
  maxHeight: number;
  lines: ReturnType<typeof buildCodeLines>;
  showLineNumbers: boolean;
  highlighted: Set<number>;
  tokens: ReturnType<typeof useAgentCodeTokens>;
  wrap: boolean;
}) {
  return (
    <div
      ref={viewportRef}
      aria-live={streaming ? 'polite' : undefined}
      className="scrollbar-hide border-foreground/[0.06] overflow-auto border-t py-2"
      role={streaming ? 'log' : undefined}
      style={{ maxHeight }}
    >
      <pre className="text-foreground/85 m-0 min-w-max font-mono text-xs leading-5">
        <code>
          {lines.map((line, index) => (
            <CodeBlockLineRow
              key={line.offset}
              highlighted={highlighted}
              line={line}
              lineNumber={index + 1}
              showLineNumbers={showLineNumbers}
              tokens={tokens}
              wrap={wrap}
            />
          ))}
        </code>
      </pre>
    </div>
  );
}

function CodeBlockInner({
  code,
  language,
  filename,
  status,
  showLineNumbers,
  highlightLines,
  maxHeight,
  wrap,
  copyable,
  onCopy,
  className,
}: Required<
  Pick<
    CodeBlockProps,
    'language' | 'status' | 'showLineNumbers' | 'highlightLines' | 'maxHeight' | 'wrap' | 'copyable'
  >
> &
  Pick<CodeBlockProps, 'filename' | 'onCopy' | 'className'> & { code: string }) {
  const reduce = useReducedMotion() ?? false;
  const viewportRef = useRef<HTMLDivElement>(null);
  const copyTimer = useRef<number | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const streaming = status === 'streaming';
  const tokens = useAgentCodeTokens(code, language);
  const highlighted = useMemo(() => new Set(highlightLines), [highlightLines]);
  const lines = buildCodeLines(code);

  useEffect(
    () => () => {
      if (copyTimer.current) {
        window.clearTimeout(copyTimer.current);
      }
    },
    [],
  );

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !streaming) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      if (viewport.scrollHeight <= viewport.clientHeight) {
        return;
      }
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
    if (onCopy) {
      await onCopy();
    } else {
      await navigator.clipboard?.writeText(code);
    }

    setCopied(true);
    if (copyTimer.current) {
      window.clearTimeout(copyTimer.current);
    }
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
  }, [code, onCopy]);

  return (
    <div
      aria-busy={streaming}
      className={cn('bg-muted/80 w-full overflow-hidden rounded-2xl text-sm', className)}
      data-state={status}
    >
      <CodeBlockHeader
        copied={copied}
        copyable={copyable}
        filename={filename}
        language={language}
        reduce={reduce}
        streaming={streaming}
        onCopy={onCopy}
        onCopyClick={handleCopy}
      />

      <CodeBlockViewport
        highlighted={highlighted}
        lines={lines}
        maxHeight={maxHeight}
        showLineNumbers={showLineNumbers}
        streaming={streaming}
        tokens={tokens}
        viewportRef={viewportRef}
        wrap={wrap}
      />
    </div>
  );
}

export function CodeBlock({
  code,
  language = 'typescript',
  filename,
  status = 'complete',
  showLineNumbers = true,
  highlightLines = [],
  maxHeight = 280,
  wrap = false,
  copyable = true,
  onCopy,
  className,
}: CodeBlockProps) {
  return (
    <CodeBlockInner
      className={className}
      code={code}
      copyable={copyable}
      filename={filename}
      highlightLines={highlightLines}
      language={language}
      maxHeight={maxHeight}
      showLineNumbers={showLineNumbers}
      status={status}
      wrap={wrap}
      onCopy={onCopy}
    />
  );
}
