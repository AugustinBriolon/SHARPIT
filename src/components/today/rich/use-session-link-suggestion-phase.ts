'use client';

import { useEffect, useState } from 'react';
import { useIsDemoMode } from '@/hooks/use-is-demo-mode';
import { usePlannedSessionMutations } from '@/hooks/use-data';
import { dismissSessionLinkSuggestion } from '@/lib/today/session-link-dismissals';
import {
  demoAnalyzingDelayMs,
  linkErrorMessage,
  type LinkPhase,
} from '@/components/today/rich/session-link-suggestion-helpers';

export function useSessionLinkSuggestionPhase({
  plannedSessionId,
  activityId,
  suggestionId,
  onLinked,
  onDismiss,
}: {
  plannedSessionId: string;
  activityId: string;
  suggestionId: string;
  onLinked?: () => void;
  onDismiss?: () => void;
}) {
  const { link } = usePlannedSessionMutations();
  const isDemo = useIsDemoMode();
  const [phase, setPhase] = useState<LinkPhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const busy = phase === 'linking' || phase === 'analyzing' || link.isPending;

  useEffect(() => {
    if (phase !== 'analyzing' || !isDemo) {
      return;
    }
    const timer = window.setTimeout(() => {
      setPhase('done');
      window.setTimeout(() => {
        setPhase('idle');
        onLinked?.();
      }, 900);
    }, demoAnalyzingDelayMs());
    return () => window.clearTimeout(timer);
  }, [isDemo, onLinked, phase]);

  function handleLink() {
    setErrorMessage(null);
    setPhase('linking');
    link.mutate(
      { id: plannedSessionId, activityId },
      {
        onSuccess: () => {
          if (isDemo) {
            setPhase('analyzing');
            return;
          }
          setPhase('idle');
          onLinked?.();
        },
        onError: (error) => {
          setPhase('idle');
          setErrorMessage(linkErrorMessage(error));
        },
      },
    );
  }

  function handleDismiss() {
    dismissSessionLinkSuggestion(suggestionId);
    onDismiss?.();
  }

  return {
    busy,
    errorMessage,
    handleDismiss,
    handleLink,
    phase,
  };
}
