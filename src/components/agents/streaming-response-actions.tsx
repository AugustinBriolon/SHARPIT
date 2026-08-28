'use client';

import { Check, Copy, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StreamingResponseFeedback } from './streaming-response';
import { ResponseAction } from './streaming-response-action';
import { StreamingFeedbackActions } from './streaming-response-feedback';
import { StreamingSourcesPanel, StreamingSourcesToggle } from './streaming-response-sources';

export function StreamingResponseActions({
  actionsClassName,
  canCopy,
  complete,
  copied,
  currentFeedback,
  currentSourcesOpen,
  hasSources,
  onCopy,
  onFeedback,
  onRetry,
  onSourcesOpenChange,
  resolvedSourcePrefix,
  sources,
  sourcesContentId,
}: {
  actionsClassName?: string;
  canCopy: boolean;
  complete: boolean;
  copied: boolean;
  currentFeedback: StreamingResponseFeedback;
  currentSourcesOpen: boolean;
  hasSources: boolean;
  onCopy: () => void;
  onFeedback: (next: Exclude<StreamingResponseFeedback, null>) => void;
  onRetry?: () => void;
  onSourcesOpenChange: (open: boolean) => void;
  resolvedSourcePrefix: string;
  sources: import('./citations').CitationItem[];
  sourcesContentId: string;
}) {
  return (
    <>
      <div className={cn('flex items-center gap-0.5', actionsClassName)}>
        {canCopy ? (
          <ResponseAction label={copied ? 'Copied' : 'Copy response'} onClick={onCopy}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </ResponseAction>
        ) : null}
        {onRetry ? (
          <ResponseAction label="Retry response" onClick={onRetry}>
            <RotateCcw className="size-3.5" />
          </ResponseAction>
        ) : null}
        {complete ? (
          <StreamingFeedbackActions currentFeedback={currentFeedback} onFeedback={onFeedback} />
        ) : null}
        {hasSources ? (
          <StreamingSourcesToggle
            currentSourcesOpen={currentSourcesOpen}
            sources={sources}
            sourcesContentId={sourcesContentId}
            onSourcesOpenChange={onSourcesOpenChange}
          />
        ) : null}
      </div>
      {hasSources ? (
        <StreamingSourcesPanel
          currentSourcesOpen={currentSourcesOpen}
          resolvedSourcePrefix={resolvedSourcePrefix}
          sources={sources}
          sourcesContentId={sourcesContentId}
        />
      ) : null}
    </>
  );
}
