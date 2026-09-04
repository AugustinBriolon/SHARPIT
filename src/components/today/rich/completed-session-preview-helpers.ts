import { ActivityType } from '@prisma/client';

/** Strength never carries a GPS path; skip the stream fetch on Today previews. */
export function activityMayHaveRoutePath(type: ActivityType): boolean {
  return type !== ActivityType.STRENGTH;
}

export function hasUsableRoutePath(path: [number, number][] | null | undefined): boolean {
  return Array.isArray(path) && path.length > 1;
}

export function resolveUsableRoutePath(
  path: [number, number][] | null | undefined,
): [number, number][] | null {
  return hasUsableRoutePath(path) ? path! : null;
}

export function resolveCompletedSessionMapSlot(input: {
  mayHavePath: boolean;
  isPending: boolean;
  isError: boolean;
  usablePath: [number, number][] | null;
}): boolean {
  const { mayHavePath, isPending, isError, usablePath } = input;
  return mayHavePath && (isPending || Boolean(usablePath)) && !isError;
}
