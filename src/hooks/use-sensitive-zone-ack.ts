'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  clearSensitiveZoneAck,
  getSensitiveZoneAckSnapshot,
  isSessionAcked,
  parseSensitiveZoneAckSnapshot,
  recordSensitiveZoneAck,
  subscribeSensitiveZoneAcks,
} from '@/lib/physical-health/sensitive-zone-ack';

/**
 * Whether the athlete has accepted this session's sensitive-zone warning as
 * deliberate, and the two ways to change their mind.
 *
 * Prerender-safe: the server snapshot is empty, so nothing is silenced until
 * the client store is read.
 */
export function useSensitiveZoneAck(sessionId: string): {
  acked: boolean;
  acknowledge: () => void;
  undo: () => void;
} {
  const snapshot = useSyncExternalStore(
    subscribeSensitiveZoneAcks,
    getSensitiveZoneAckSnapshot,
    () => '',
  );
  const acked = useMemo(
    () => isSessionAcked(parseSensitiveZoneAckSnapshot(snapshot), sessionId),
    [snapshot, sessionId],
  );

  const acknowledge = useCallback(
    () => recordSensitiveZoneAck({ sessionId, now: new Date() }),
    [sessionId],
  );
  const undo = useCallback(() => clearSensitiveZoneAck(sessionId), [sessionId]);

  return { acked, acknowledge, undo };
}
