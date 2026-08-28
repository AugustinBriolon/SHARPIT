import type { StreamingResponseProps } from './streaming-response';

export function streamingResponseFlags(props: StreamingResponseProps) {
  const status = props.status ?? 'streaming';
  return {
    complete: status === 'complete',
    streaming: status === 'streaming',
  };
}

export function shouldShowStreamingActions(props: StreamingResponseProps) {
  const { complete, streaming } = streamingResponseFlags(props);
  const canCopy = Boolean(props.copyText || props.onCopy);
  const hasSources = (props.sources ?? []).length > 0;
  return canCopy || Boolean(props.onRetry) || complete || hasSources;
}

export function streamingResponseActionsVisible(props: StreamingResponseProps) {
  const flags = streamingResponseFlags(props);
  const canCopy = Boolean(props.copyText || props.onCopy);
  const hasSources = (props.sources ?? []).length > 0;

  if (flags.streaming || props.showActions === false) {
    return { ...flags, canCopy, hasSources, shouldShowActions: false };
  }

  return {
    ...flags,
    canCopy,
    hasSources,
    shouldShowActions: shouldShowStreamingActions(props),
  };
}
