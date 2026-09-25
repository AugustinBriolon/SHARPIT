const HOLD_STORAGE_PREFIX = 'sharpit.morning-hold.';
const MORNING_HOLD_EVENT = 'sharpit:morning-hold-changed';

export function morningHoldStorageKey(trainingDayId: string): string {
  return `${HOLD_STORAGE_PREFIX}${trainingDayId}`;
}

export function readClientMorningHold(trainingDayId: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return sessionStorage.getItem(morningHoldStorageKey(trainingDayId)) === '1';
  } catch {
    return false;
  }
}

function emitMorningHoldChanged(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(MORNING_HOLD_EVENT));
}

export function writeClientMorningHold(trainingDayId: string): void {
  try {
    sessionStorage.setItem(morningHoldStorageKey(trainingDayId), '1');
    emitMorningHoldChanged();
  } catch {
    // ignore quota / private mode
  }
}

export function subscribeMorningHold(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  window.addEventListener(MORNING_HOLD_EVENT, callback);
  return () => window.removeEventListener(MORNING_HOLD_EVENT, callback);
}
