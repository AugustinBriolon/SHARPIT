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
    return 'grid-cols-1 grid-rows-[8rem_minmax(7.5rem,1fr)]';
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
    return 'relative z-10 flex min-h-30 flex-col gap-2.5 bg-card px-4 py-3';
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
  rememberedHasPath?: boolean | null;
}): boolean {
  const { mayHavePath, isPending, isError, usablePath, rememberedHasPath = null } = input;
  if (!mayHavePath || isError) {
    return false;
  }
  if (usablePath || rememberedHasPath === true) {
    return true;
  }
  if (rememberedHasPath === false) {
    return false;
  }
  return isPending;
}

export type CompletedSessionPreviewRoute =
  { status: 'pending' } | { status: 'ready'; path: [number, number][] | null };

export function resolveBatchPreviewPath(
  previewRoute: CompletedSessionPreviewRoute | undefined,
): [number, number][] | null {
  if (!previewRoute || previewRoute.status !== 'ready') {
    return null;
  }
  return resolveUsableRoutePath(previewRoute.path);
}

export function resolvePreviewUsablePath(input: {
  batchMode: boolean;
  batchPath: [number, number][] | null;
  streamPath: [number, number][] | null;
  rememberedPath: [number, number][] | null;
}): [number, number][] | null {
  const primary = input.batchMode ? input.batchPath : input.streamPath;
  return primary ?? input.rememberedPath;
}

export function isPreviewMapPending(input: {
  batchMode: boolean;
  previewPending: boolean;
  mayHavePath: boolean;
  usablePath: [number, number][] | null;
  mapEnabled: boolean;
  streamPending: boolean;
}): boolean {
  if (input.batchMode) {
    return input.previewPending && input.mayHavePath && !input.usablePath;
  }
  return input.mapEnabled && input.streamPending;
}

/**
 * Hub list GPS state — pending only while the batch is in flight.
 * Once settled (success or error), missing ids become ready/null (sport band),
 * never an infinite skeleton.
 */
export function resolveHubPreviewRoute(
  activityId: string,
  routePreviews: Record<string, [number, number][]> | undefined,
  routePreviewsPending: boolean,
): CompletedSessionPreviewRoute {
  if (routePreviewsPending) {
    return { status: 'pending' };
  }
  return { status: 'ready', path: routePreviews?.[activityId] ?? null };
}

/** Persist hub route memory from batch or stream — called from preview mount effect. */
export function pathToRememberForPreview(input: {
  batchMode: boolean;
  previewRoute?: CompletedSessionPreviewRoute;
  mapEnabled: boolean;
  mayHavePath: boolean;
  streamFetched: boolean;
  streamPath: [number, number][] | null | undefined;
}): [number, number][] | null | undefined {
  if (input.batchMode) {
    if (input.previewRoute?.status !== 'ready') {
      return undefined;
    }
    return resolveUsableRoutePath(input.previewRoute.path);
  }
  if (!input.mapEnabled || !input.mayHavePath || !input.streamFetched) {
    return undefined;
  }
  return resolveUsableRoutePath(input.streamPath);
}
