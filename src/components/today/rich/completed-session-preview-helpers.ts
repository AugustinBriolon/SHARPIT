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

export type CompletedSessionPreviewLayout = 'column' | 'split' | 'stack';

export function completedPreviewGridClass(
  layout: CompletedSessionPreviewLayout,
  showMapSlot: boolean,
): string {
  if (layout === 'stack') {
    return 'grid-cols-1';
  }
  if (layout === 'split') {
    return 'grid-cols-[minmax(0,42%)_minmax(0,58%)] items-stretch';
  }
  return showMapSlot
    ? 'sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] sm:items-stretch'
    : 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:items-stretch';
}

export function completedPreviewDetailsClass(
  layout: CompletedSessionPreviewLayout,
  showMapSlot: boolean,
): string {
  if (layout === 'split') {
    return 'relative z-10 flex flex-col justify-center gap-2 bg-card px-3 py-3';
  }
  if (layout === 'stack') {
    return 'relative z-10 flex flex-col gap-2.5 bg-card px-4 py-3';
  }
  return showMapSlot
    ? 'relative z-10 flex flex-col justify-end gap-3 bg-card px-4 pt-2 pb-4 sm:justify-center sm:px-5 sm:py-5 sm:pl-2'
    : 'relative z-10 flex flex-col justify-end gap-3 bg-card px-4 pt-2 pb-4 sm:justify-center sm:px-5 sm:py-5';
}

export function completedPreviewFadeClass(layout: CompletedSessionPreviewLayout): string {
  if (layout === 'split') {
    return 'bg-linear-to-r from-transparent from-30% to-card';
  }
  if (layout === 'column') {
    return 'bg-linear-to-b from-transparent from-30% to-card sm:bg-linear-to-r sm:from-transparent sm:from-30% sm:to-card';
  }
  return 'bg-linear-to-b from-transparent from-30% to-card';
}

export function selectCompletedPreviewMetrics<T>(
  metrics: readonly T[],
  layout: CompletedSessionPreviewLayout,
): T[] {
  if (layout === 'stack') {
    return metrics.slice(0, 2);
  }
  return [...metrics];
}

export function completedPreviewTitleClass(layout: CompletedSessionPreviewLayout): string {
  if (layout === 'split') {
    return 'text-card-title min-w-0 truncate text-sm text-pretty';
  }
  if (layout === 'stack') {
    return 'text-card-title min-w-0 line-clamp-2 text-sm leading-snug text-pretty';
  }
  return 'text-card-title min-w-0 text-pretty';
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
