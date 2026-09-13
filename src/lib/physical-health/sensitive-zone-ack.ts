/**
 * "C'est voulu" — the athlete accepting one flagged session as deliberate.
 *
 * The zone guard cannot tell prehab from aggravation: a clamshell and a hip
 * thrust load the glute the sciatica sits under, and they are also the standard
 * rehab for it. A real generation proved the point — a session explicitly asked
 * for as preventive work came back flagged on six of its exercises, every one
 * of them correct and every one of them intended.
 *
 * So the athlete gets the last word, per session. Acknowledging silences that
 * one session's warning and nothing else: the condition still counts, other
 * sessions still warn, and the next generation is judged from scratch.
 *
 * Client-local by design, like the adapt-applied ack it mirrors: this is a UI
 * acknowledgement, not a training decision, and it earns no schema change.
 * The trade is that an ack made on the phone is not visible on the laptop.
 *
 * Pure except for the localStorage accessors; no React.
 */

const STORAGE_KEY = 'sharpit:sensitive-zone-ack';
const CHANGE_EVENT = 'sharpit:sensitive-zone-ack';

/** Entries older than this are dropped on write — a session that old is history. */
const ACK_RETENTION_DAYS = 120;

export type SensitiveZoneAcks = {
  version: 1;
  /** Planned session id → ISO timestamp of the athlete's acknowledgement. */
  acks: Record<string, string>;
};

const EMPTY: SensitiveZoneAcks = { version: 1, acks: {} };

function isAcksShape(value: unknown): value is SensitiveZoneAcks {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record.version !== 1 || !record.acks || typeof record.acks !== 'object') {
    return false;
  }
  return Object.values(record.acks as Record<string, unknown>).every(
    (entry) => typeof entry === 'string',
  );
}

/** Drop acknowledgements old enough that their session no longer matters. */
export function pruneAcks(acks: SensitiveZoneAcks, now: Date): SensitiveZoneAcks {
  const cutoff = now.getTime() - ACK_RETENTION_DAYS * 86_400_000;
  const kept = Object.entries(acks.acks).filter(([, ackedAt]) => {
    const at = Date.parse(ackedAt);
    return Number.isFinite(at) && at >= cutoff;
  });
  return { version: 1, acks: Object.fromEntries(kept) };
}

export function isSessionAcked(acks: SensitiveZoneAcks | null, sessionId: string): boolean {
  return Boolean(acks && sessionId && acks.acks[sessionId]);
}

export function readSensitiveZoneAcks(): SensitiveZoneAcks {
  if (typeof window === 'undefined') {
    return EMPTY;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return EMPTY;
    }
    const parsed: unknown = JSON.parse(raw);
    return isAcksShape(parsed) ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Stable snapshot for `useSyncExternalStore`. */
export function getSensitiveZoneAckSnapshot(): string {
  const acks = readSensitiveZoneAcks();
  const ids = Object.keys(acks.acks);
  return ids.length === 0 ? '' : JSON.stringify(acks);
}

export function parseSensitiveZoneAckSnapshot(snapshot: string): SensitiveZoneAcks | null {
  if (!snapshot) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(snapshot);
    return isAcksShape(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persist(acks: SensitiveZoneAcks): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(acks));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function recordSensitiveZoneAck(input: {
  sessionId: string;
  /** Required — pass from the click handler (`new Date()` is fine there). */
  now: Date;
}): void {
  const pruned = pruneAcks(readSensitiveZoneAcks(), input.now);
  persist({
    version: 1,
    acks: { ...pruned.acks, [input.sessionId]: input.now.toISOString() },
  });
}

export function clearSensitiveZoneAck(sessionId: string): void {
  const current = readSensitiveZoneAcks();
  if (!current.acks[sessionId]) {
    return;
  }
  const { [sessionId]: _removed, ...rest } = current.acks;
  persist({ version: 1, acks: rest });
}

export function subscribeSensitiveZoneAcks(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}
