/**
 * Client ack after PlanAdapter apply — clears stale rearrange until next local morning.
 * Presentation-only; Core frozen. No silent calendar writes.
 */

const STORAGE_KEY = 'sharpit:adapt-applied-ack';
const CHANGE_EVENT = 'sharpit:adapt-applied-ack';

export type AdaptAppliedAck = {
  /** ISO timestamp of athlete validation. */
  appliedAt: string;
  /** Local calendar day `YYYY-MM-DD` when applied. */
  dayKey: string;
  goalLabel: string | null;
  changeCount: number;
};

function isAckShape(value: unknown): value is AdaptAppliedAck {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.appliedAt === 'string' &&
    typeof record.dayKey === 'string' &&
    (record.goalLabel === null || typeof record.goalLabel === 'string') &&
    typeof record.changeCount === 'number'
  );
}

/** Local calendar day key — morning boundary for ack expiry. */
export function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildAdaptAppliedAck(input: {
  goalLabel: string | null;
  changeCount: number;
  now?: Date;
}): AdaptAppliedAck {
  const now = input.now ?? new Date();
  return {
    appliedAt: now.toISOString(),
    dayKey: localDayKey(now),
    goalLabel: input.goalLabel?.trim() || null,
    changeCount: Math.max(0, input.changeCount),
  };
}

/**
 * Same local day as apply → suppress stale rearrange / living tension CTA.
 * Next morning (new dayKey) → ack expired; Twin detector may propose again.
 */
export function shouldSuppressRearrangeAfterApply(
  ack: AdaptAppliedAck | null,
  now: Date = new Date(),
): boolean {
  if (!ack) {
    return false;
  }
  return ack.dayKey === localDayKey(now);
}

export function adaptAppliedHeadline(goalLabel: string | null): string {
  return goalLabel?.trim() ? `Plan ajusté vers ${goalLabel.trim()}` : 'Plan ajusté';
}

export function adaptAppliedWhy(changeCount: number): string {
  if (changeCount <= 0) {
    return 'Ta validation est prise en compte. On reverra demain matin si le Twin détecte une nouvelle tension.';
  }
  const n = changeCount;
  return `${n} séance${n > 1 ? 's' : ''} mise${n > 1 ? 's' : ''} à jour. On reverra demain matin si le Twin détecte une nouvelle tension.`;
}

export function readAdaptAppliedAck(): AdaptAppliedAck | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isAckShape(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Stable snapshot for `useSyncExternalStore`. */
export function getAdaptAppliedAckSnapshot(): string {
  const ack = readAdaptAppliedAck();
  return ack ? JSON.stringify(ack) : '';
}

export function recordAdaptAppliedAck(input: {
  goalLabel: string | null;
  changeCount: number;
  now?: Date;
}): AdaptAppliedAck {
  const ack = buildAdaptAppliedAck(input);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ack));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  return ack;
}

export function clearAdaptAppliedAck(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeAdaptAppliedAck(onStoreChange: () => void): () => void {
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

export function parseAdaptAppliedAckSnapshot(snapshot: string): AdaptAppliedAck | null {
  if (!snapshot) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(snapshot);
    return isAckShape(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
