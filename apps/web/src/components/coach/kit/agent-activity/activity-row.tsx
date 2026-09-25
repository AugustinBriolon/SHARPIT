import {
  Check,
  Circle,
  FileText,
  Globe2,
  ImageIcon,
  MessageSquare,
  PencilLine,
  Search,
  Sparkles,
  SquareTerminal,
  Wrench,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { EASE_OUT, SPRING_LAYOUT } from '@/lib/ease';
import { cn } from '@/lib/utils';
import type {
  AgentActivityItem,
  AgentActivitySearch,
  AgentActivityStep,
  AgentActivityText,
  AgentActivityTool,
  AgentActivityTrace,
  AgentSearchResult,
} from './types';

function StepStateIcon({ state }: { state: 'complete' | 'active' | 'pending' }) {
  if (state === 'complete') {
    return <Check className="size-4" strokeWidth={1.8} />;
  }
  if (state === 'active') {
    return (
      <span className="relative grid size-3 place-items-center">
        <motion.span
          animate={{ opacity: [0.35, 0.8, 0.35] }}
          className="bg-foreground/10 absolute inset-0 rounded-full"
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
        />
        <span className="bg-foreground/60 size-1.5 rounded-full" />
      </span>
    );
  }
  return <Circle className="size-3" strokeWidth={1.5} />;
}

function StepRow({ item }: { item: AgentActivityStep }) {
  const state = item.status ?? 'complete';

  return (
    <div className="flex min-h-7 items-start gap-2.5 rounded-md px-1.5 py-1">
      <span
        aria-hidden="true"
        className="text-muted-foreground/70 mt-0.5 grid size-4 shrink-0 place-items-center"
      >
        <StepStateIcon state={state} />
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 leading-5',
          state === 'pending' ? 'text-muted-foreground/55' : 'text-foreground/90',
        )}
      >
        {item.label}
      </span>
      {item.meta ? (
        <span className="text-muted-foreground/55 shrink-0 leading-5">{item.meta}</span>
      ) : null}
    </div>
  );
}

function TextRow({ item }: { item: AgentActivityText }) {
  return (
    <div className="text-muted-foreground rounded-md px-1.5 py-1 leading-5">{item.content}</div>
  );
}

function SearchResultRow({ result }: { result: AgentSearchResult }) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className="text-muted-foreground grid size-5 shrink-0 place-items-center"
      >
        {result.icon ?? <Globe2 className="size-3" strokeWidth={2} />}
      </span>
      <span className="text-foreground/90 min-w-0 truncate font-medium">{result.title}</span>
      {result.domain ? (
        <span className="text-muted-foreground/55 min-w-0 truncate">{result.domain}</span>
      ) : null}
    </>
  );
  const className = cn(
    'flex min-h-7 items-center gap-2 rounded-md px-1.5 py-1 text-left outline-none transition-colors',
    result.url && 'focus-visible:ring-2 focus-visible:ring-ring',
  );

  return result.url ? (
    <a className={className} href={result.url}>
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  );
}

function SearchRow({ item }: { item: AgentActivitySearch }) {
  const reduce = useReducedMotion() ?? false;
  const enter = reduce ? { opacity: 1 } : { opacity: 0, y: 6 };
  const visible = { opacity: 1, y: 0 };
  const exit = reduce ? { opacity: 0 } : { opacity: 0, y: -3 };
  const transition = reduce
    ? { duration: 0 }
    : {
        opacity: { duration: 0.18, ease: EASE_OUT },
        y: SPRING_LAYOUT,
        layout: SPRING_LAYOUT,
      };

  return (
    <div className="space-y-0.5">
      <div className="text-muted-foreground flex min-h-7 items-center gap-2.5 rounded-md px-1.5 py-1">
        <Search aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.7} />
        <span className="min-w-0 truncate">{item.query}</span>
      </div>
      {item.results?.length ? (
        <div className="space-y-0.5 pl-4">
          <AnimatePresence mode="popLayout" initial>
            {item.results.map((result) => (
              <motion.div
                key={result.id}
                animate={visible}
                exit={exit}
                initial={enter}
                layout="position"
                transition={transition}
              >
                <SearchResultRow result={result} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : null}
      <AnimatePresence initial>
        {item.moreCount ? (
          <motion.div
            key="more-results"
            animate={visible}
            className="text-muted-foreground/55 px-1.5 py-1 pl-8"
            exit={exit}
            initial={enter}
            transition={transition}
          >
            +{item.moreCount} more
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ActionIcon({ action }: { action: string }) {
  if (action === 'read') {
    return <FileText className="size-4" />;
  }
  if (action === 'edit' || action === 'write') {
    return <PencilLine className="size-4" />;
  }
  if (action === 'run') {
    return <SquareTerminal className="size-4" />;
  }
  return <Wrench className="size-4" />;
}

function ToolRow({ item }: { item: AgentActivityTool }) {
  const action = item.action.charAt(0).toUpperCase() + item.action.slice(1);

  return (
    <div className="flex min-h-8 min-w-0 items-center gap-2.5 rounded-md px-1.5 py-0.5 leading-5">
      <span
        aria-hidden="true"
        className="text-muted-foreground/70 grid size-4 shrink-0 place-items-center"
      >
        <ActionIcon action={item.action} />
      </span>
      <span className="text-foreground/90 shrink-0 font-medium">{action}</span>
      <span className="bg-muted/80 text-muted-foreground/70 min-w-0 flex-1 truncate rounded-lg px-2.5 py-1 font-mono text-xs">
        {item.target}
      </span>
      {typeof item.additions === 'number' || typeof item.deletions === 'number' ? (
        <span className="flex shrink-0 items-center gap-2 font-mono tabular-nums">
          {typeof item.additions === 'number' ? (
            <span className="text-emerald-500">+{item.additions}</span>
          ) : null}
          {typeof item.deletions === 'number' ? (
            <span className="text-rose-500">−{item.deletions}</span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

function TraceIcon({ kind }: { kind: AgentActivityTrace['kind'] }) {
  if (kind === 'thinking') {
    return <Sparkles className="size-4" />;
  }
  if (kind === 'message') {
    return <MessageSquare className="size-4" />;
  }
  if (kind === 'write') {
    return <PencilLine className="size-4" />;
  }
  if (kind === 'run') {
    return <SquareTerminal className="size-4" />;
  }
  if (kind === 'read') {
    return <ImageIcon className="size-4" />;
  }
  return <Wrench className="size-4" />;
}

function TraceRow({ item }: { item: AgentActivityTrace }) {
  return (
    <div className="grid min-h-8 grid-cols-[1rem_auto_minmax(0,1fr)] items-center gap-2.5 rounded-md px-1.5 py-0.5">
      <span aria-hidden="true" className="text-muted-foreground/70 grid size-4 place-items-center">
        {item.icon ?? <TraceIcon kind={item.kind} />}
      </span>
      <span className="text-foreground/90 font-medium">{item.label}</span>
      {item.detail ? (
        <span className="bg-muted/80 text-muted-foreground/70 min-w-0 truncate rounded-lg px-2.5 py-1 font-mono text-xs">
          {item.detail}
        </span>
      ) : (
        <span />
      )}
    </div>
  );
}

export function ActivityRow({ item }: { item: AgentActivityItem }) {
  if (item.type === 'text') {
    return <TextRow item={item} />;
  }
  if (item.type === 'search') {
    return <SearchRow item={item} />;
  }
  if (item.type === 'tool') {
    return <ToolRow item={item} />;
  }
  if (item.type === 'trace') {
    return <TraceRow item={item} />;
  }
  return <StepRow item={item} />;
}
