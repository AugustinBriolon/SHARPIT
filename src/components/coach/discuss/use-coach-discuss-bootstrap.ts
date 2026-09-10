'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import {
  buildDiscussContext,
  buildDiscussIntentKey,
  buildDiscussSourceBundle,
  latchDiscussContextWhenReady,
  useDiscussBootstrapQueries,
  useDiscussBootstrapSync,
  useDiscussContextLatch,
  useDiscussDataReadyFlag,
  type CoachDiscussParams,
} from '@/components/coach/discuss/use-coach-discuss-bootstrap-helpers';
import type { CoachDiscussContext } from '@/lib/coach/chat/discuss/coach-discuss-context';

export type { CoachDiscussParams };

export function useCoachDiscussBootstrap(
  params: CoachDiscussParams,
  onDiscussReady: (context: CoachDiscussContext) => void,
) {
  const router = useRouter();
  const latch = useDiscussContextLatch();
  const queries = useDiscussBootstrapQueries(params.discussPlanningHorizon);

  const discussIntentKey = useMemo(() => buildDiscussIntentKey(params), [params]);
  const discussSources = useMemo(
    () => buildDiscussSourceBundle(params, queries),
    [params, queries],
  );
  const discussDataReady = useDiscussDataReadyFlag({
    params,
    discussIntentKey,
    contextLatchEpoch: latch.contextLatchEpoch,
    discussSources,
    latchedDiscussIntentKeyRef: latch.latchedDiscussIntentKeyRef,
  });
  const discussContext = useMemo(() => buildDiscussContext(discussSources), [discussSources]);

  useDiscussBootstrapSync({
    params,
    discussIntentKey,
    discussContext,
    discussSources,
    queries,
    latch,
    onDiscussReady,
    router,
  });

  latchDiscussContextWhenReady(discussDataReady, discussContext, discussIntentKey, latch);

  return {
    latchedContext: latch.latchedContextRef.current,
    detachLatchedContext: latch.detachLatchedContext,
    attachLatchedContext: latch.attachLatchedContext,
  };
}
