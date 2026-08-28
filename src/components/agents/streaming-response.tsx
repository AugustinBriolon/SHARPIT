'use client';
// beui.dev/components/agents/chat-app

import { StreamingResponseView } from '@/components/agents/streaming-response-view';
import { useStreamingResponseState } from '@/components/agents/use-streaming-response';
import { type CitationItem } from '@/components/agents/citations';

export type StreamingResponseStatus = 'streaming' | 'complete' | 'error';
export type StreamingResponseFeedback = 'up' | 'down' | null;

export interface StreamingResponseProps {
  children: React.ReactNode;
  status?: StreamingResponseStatus;
  copyText?: string;
  onCopy?: () => void | Promise<void>;
  onRetry?: () => void;
  sources?: CitationItem[];
  sourcesOpen?: boolean;
  defaultSourcesOpen?: boolean;
  onSourcesOpenChange?: (open: boolean) => void;
  sourceIdPrefix?: string;
  feedback?: StreamingResponseFeedback;
  defaultFeedback?: StreamingResponseFeedback;
  onFeedbackChange?: (feedback: StreamingResponseFeedback) => void;
  announce?: boolean;
  showActions?: boolean;
  className?: string;
  contentClassName?: string;
  actionsClassName?: string;
}

export function StreamingResponse(props: StreamingResponseProps) {
  const state = useStreamingResponseState(props);
  return <StreamingResponseView props={props} state={state} />;
}
