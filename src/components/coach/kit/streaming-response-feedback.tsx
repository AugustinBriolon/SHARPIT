'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import type { StreamingResponseFeedback } from './streaming-response';
import { ResponseAction } from './streaming-response-action';

export function StreamingFeedbackActions({
  currentFeedback,
  onFeedback,
}: {
  currentFeedback: StreamingResponseFeedback;
  onFeedback: (next: Exclude<StreamingResponseFeedback, null>) => void;
}) {
  return (
    <>
      <ResponseAction
        active={currentFeedback === 'up'}
        label="Helpful"
        onClick={() => onFeedback('up')}
      >
        <ThumbsUp className="size-3.5" />
      </ResponseAction>
      <ResponseAction
        active={currentFeedback === 'down'}
        label="Not helpful"
        onClick={() => onFeedback('down')}
      >
        <ThumbsDown className="size-3.5" />
      </ResponseAction>
    </>
  );
}
