import type { ActivityType } from '@prisma/client';
import { sportIdentityHex } from '@/lib/activity/sport-identity';

type StreamPayload = NonNullable<
  Awaited<ReturnType<typeof import('@/hooks/use-data').useActivityStream>>['data']
>;

function buildStreamPathProps(data: StreamPayload) {
  const { path } = data;
  return {
    hasPath: Boolean(path && path.length > 1),
    path,
  };
}

function buildStreamAnalysisProps(data: StreamPayload) {
  const { analysis } = data;
  if (!analysis) {
    return { ftp: null, hrZones: [], lthr: null, powerZones: [] };
  }
  return {
    ftp: analysis.thresholds.ftp,
    hrZones: analysis.hr.zones,
    lthr: analysis.thresholds.lthr,
    powerZones: analysis.power?.zones ?? [],
  };
}

export function streamCompositionProps(data: StreamPayload, type: ActivityType) {
  return {
    ...buildStreamPathProps(data),
    ...buildStreamAnalysisProps(data),
    routeColor: sportIdentityHex(type),
  };
}
