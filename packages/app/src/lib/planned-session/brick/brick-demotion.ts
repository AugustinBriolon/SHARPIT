/**
 * Product lock: a brick is a 2-leg chain. Fewer than 2 legs is not a brick.
 * Clearing metadata demotes the remainder to a simple session (no half-brick tag).
 */
export const BRICK_MIN_LEGS = 2;

/** True when remaining linked legs can no longer form a brick. */
export function shouldDemoteBrick(remainingLegCount: number): boolean {
  return remainingLegCount < BRICK_MIN_LEGS;
}

/** Patch applied to a surviving leg when the brick dissolves. */
export function clearedBrickMetadata(): { brickGroupId: null; brickOrder: null } {
  return { brickGroupId: null, brickOrder: null };
}

type BrickLegFields = {
  id: string;
  brickGroupId: string | null;
  brickOrder: number | null;
};

/**
 * After removing one planned session from a list: if the removed row belonged to a
 * brick and fewer than 2 legs remain, strip brick metadata on survivors.
 */
export function demoteBrickLegsAfterRemoval<T extends BrickLegFields>(
  sessions: readonly T[],
  removedId: string,
): T[] {
  const removed = sessions.find((session) => session.id === removedId);
  const remaining = sessions.filter((session) => session.id !== removedId);
  if (!removed?.brickGroupId) {
    return remaining;
  }

  const groupId = removed.brickGroupId;
  const siblings = remaining.filter((session) => session.brickGroupId === groupId);
  if (!shouldDemoteBrick(siblings.length)) {
    return remaining;
  }

  const cleared = clearedBrickMetadata();
  return remaining.map((session) =>
    session.brickGroupId === groupId ? { ...session, ...cleared } : session,
  );
}
