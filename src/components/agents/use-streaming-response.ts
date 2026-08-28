'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { StreamingResponseFeedback, StreamingResponseProps } from './streaming-response';
import { streamingResponseActionsVisible } from './streaming-response-helpers';

export function useStreamingResponseState(props: StreamingResponseProps) {
  const {
    copyText,
    onCopy,
    feedback,
    defaultFeedback = null,
    onFeedbackChange,
    sourcesOpen,
    defaultSourcesOpen = false,
    onSourcesOpenChange,
  } = props;

  const baseId = useId();
  const [copied, setCopied] = useState(false);
  const [internalFeedback, setInternalFeedback] =
    useState<StreamingResponseFeedback>(defaultFeedback);
  const [internalSourcesOpen, setInternalSourcesOpen] = useState(defaultSourcesOpen);
  const copyTimer = useRef<number | undefined>(undefined);

  const visibility = streamingResponseActionsVisible(props);
  const currentFeedback = feedback ?? internalFeedback;
  const currentSourcesOpen = sourcesOpen ?? internalSourcesOpen;
  const sourcesContentId = `${baseId}-sources`;
  const resolvedSourcePrefix =
    props.sourceIdPrefix ?? `response-source-${baseId.replace(/:/g, '')}`;

  useEffect(
    () => () => {
      if (copyTimer.current) {
        window.clearTimeout(copyTimer.current);
      }
    },
    [],
  );

  const handleCopy = useCallback(async () => {
    if (onCopy) {
      await onCopy();
    } else if (copyText) {
      await navigator.clipboard?.writeText(copyText);
    }

    setCopied(true);
    if (copyTimer.current) {
      window.clearTimeout(copyTimer.current);
    }
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
  }, [copyText, onCopy]);

  const setFeedback = (next: Exclude<StreamingResponseFeedback, null>) => {
    const value = currentFeedback === next ? null : next;
    if (feedback === undefined) {
      setInternalFeedback(value);
    }
    onFeedbackChange?.(value);
  };

  const setSourcesOpen = useCallback(
    (next: boolean) => {
      if (sourcesOpen === undefined) {
        setInternalSourcesOpen(next);
      }
      onSourcesOpenChange?.(next);
    },
    [onSourcesOpenChange, sourcesOpen],
  );

  return {
    ...visibility,
    copied,
    currentFeedback,
    currentSourcesOpen,
    handleCopy,
    resolvedSourcePrefix,
    setFeedback,
    setSourcesOpen,
    sourcesContentId,
  };
}
