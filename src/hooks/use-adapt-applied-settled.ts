'use client';

import { useMemo, useSyncExternalStore } from 'react';
import {
  getAdaptAppliedAckSnapshot,
  parseAdaptAppliedAckSnapshot,
  shouldSuppressRearrangeAfterApply,
  subscribeAdaptAppliedAck,
  type AdaptAppliedAck,
} from '@/lib/plan/adapt-applied-ack';
import { useClientNow } from '@/hooks/use-client-now';

/**
 * After-apply settled state for the current local day.
 * Prerender-safe: no suppress until client clock is available.
 */
export function useAdaptAppliedSettled(): {
  adaptAck: AdaptAppliedAck | null;
  settled: boolean;
} {
  const ackSnapshot = useSyncExternalStore(
    subscribeAdaptAppliedAck,
    getAdaptAppliedAckSnapshot,
    () => '',
  );
  const adaptAck = useMemo(() => parseAdaptAppliedAckSnapshot(ackSnapshot), [ackSnapshot]);
  const clientNow = useClientNow();
  const settled = Boolean(clientNow && shouldSuppressRearrangeAfterApply(adaptAck, clientNow));
  return { adaptAck, settled };
}
