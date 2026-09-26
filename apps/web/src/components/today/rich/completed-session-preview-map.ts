'use client';

import { useEffect } from 'react';
import type { ActivityType } from '@prisma/client';
import { useActivityStream } from '@/hooks/use-data';
import {
  readRememberedHubRoute,
  rememberHubRoute,
} from '@sharpit/app/lib/plan/hub/plan-hub-preview-paths';
import {
  activityMayHaveRoutePath,
  isPreviewMapPending,
  pathToRememberForPreview,
  resolveBatchPreviewPath,
  resolveCompletedSessionMapSlot,
  resolvePreviewUsablePath,
  resolveUsableRoutePath,
  type CompletedSessionPreviewRoute,
} from '@/components/today/rich/completed-session-preview-helpers';

function useRememberHubPreviewRoute(input: {
  activityId: string;
  batchMode: boolean;
  previewRoute?: CompletedSessionPreviewRoute;
  mapEnabled: boolean;
  mayHavePath: boolean;
  streamFetched: boolean;
  streamPath: [number, number][] | null | undefined;
}) {
  const {
    activityId,
    batchMode,
    previewRoute,
    mapEnabled,
    mayHavePath,
    streamFetched,
    streamPath,
  } = input;

  useEffect(() => {
    const path = pathToRememberForPreview({
      batchMode,
      previewRoute,
      mapEnabled,
      mayHavePath,
      streamFetched,
      streamPath,
    });
    if (path !== undefined) {
      rememberHubRoute(activityId, path);
    }
  }, [activityId, batchMode, mapEnabled, mayHavePath, previewRoute, streamFetched, streamPath]);
}

export function useCompletedPreviewMap(
  activityId: string,
  activityType: ActivityType,
  mapEnabled: boolean,
  previewRoute?: CompletedSessionPreviewRoute,
) {
  const mayHavePath = activityMayHaveRoutePath(activityType);
  const batchMode = previewRoute !== undefined;
  const stream = useActivityStream(activityId, {
    enabled: mapEnabled && mayHavePath && !batchMode,
  });
  const remembered = readRememberedHubRoute(activityId);
  const usablePath = resolvePreviewUsablePath({
    batchMode,
    batchPath: resolveBatchPreviewPath(previewRoute),
    streamPath: resolveUsableRoutePath(stream.data?.path),
    rememberedPath: remembered.path,
  });

  useRememberHubPreviewRoute({
    activityId,
    batchMode,
    previewRoute,
    mapEnabled,
    mayHavePath,
    streamFetched: stream.isFetched,
    streamPath: stream.data?.path,
  });

  return {
    usablePath,
    showMapSlot: resolveCompletedSessionMapSlot({
      mayHavePath,
      isPending: isPreviewMapPending({
        batchMode,
        previewPending: previewRoute?.status === 'pending',
        mayHavePath,
        usablePath,
        mapEnabled,
        streamPending: stream.isPending,
      }),
      isError: batchMode ? false : stream.isError,
      usablePath,
      rememberedHasPath: remembered.known ? remembered.hasPath : null,
    }),
  };
}
