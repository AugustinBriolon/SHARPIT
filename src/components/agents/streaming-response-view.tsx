'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { type ReactNode } from 'react';
import { StreamingResponseActions } from '@/components/agents/streaming-response-actions';
import { useStreamingResponseState } from '@/components/agents/use-streaming-response';
import { EASE_OUT } from '@/lib/ease';
import { cn } from '@/lib/utils';
import type { StreamingResponseProps } from './streaming-response';

function StreamingResponseContent({
  announce,
  children,
  contentClassName,
}: {
  announce: boolean;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <div
      aria-live={announce ? 'polite' : 'off'}
      className={cn(
        'text-foreground/90 [&_code]:bg-muted [&_pre]:border-border [&_pre]:bg-muted/45 text-sm leading-6 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p+p]:mt-3 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5',
        contentClassName,
      )}
    >
      {children}
    </div>
  );
}

export function StreamingResponseView({
  props,
  state,
}: {
  props: StreamingResponseProps;
  state: ReturnType<typeof useStreamingResponseState>;
}) {
  const reduce = useReducedMotion() ?? false;
  const {
    children,
    status = 'streaming',
    onRetry,
    sources = [],
    className,
    contentClassName,
    actionsClassName,
  } = props;

  return (
    <div aria-busy={state.streaming} className={cn('w-full', className)} data-state={status}>
      <StreamingResponseContent
        announce={props.announce ?? true}
        contentClassName={contentClassName}
      >
        {children}
      </StreamingResponseContent>

      <AnimatePresence initial={false}>
        {state.shouldShowActions ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mt-3"
            exit={{ opacity: 0 }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
            transition={{ duration: reduce ? 0.12 : 0.22, ease: EASE_OUT }}
          >
            <StreamingResponseActions
              actionsClassName={actionsClassName}
              canCopy={state.canCopy}
              complete={state.complete}
              copied={state.copied}
              currentFeedback={state.currentFeedback}
              currentSourcesOpen={state.currentSourcesOpen}
              hasSources={state.hasSources}
              resolvedSourcePrefix={state.resolvedSourcePrefix}
              sources={sources}
              sourcesContentId={state.sourcesContentId}
              onCopy={state.handleCopy}
              onFeedback={state.setFeedback}
              onRetry={onRetry}
              onSourcesOpenChange={state.setSourcesOpen}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
