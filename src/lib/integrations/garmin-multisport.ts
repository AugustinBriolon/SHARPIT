import type { GarminConnect } from '@flow-js/garmin-connect';
import { legKindLabel, mapGarminChildTypeToKind, type MultisportLeg } from '@/lib/multisport';

type GCClient = InstanceType<typeof GarminConnect>;

interface GarminActivitySummaryDTO {
  duration?: number | null;
  movingDuration?: number | null;
  distance?: number | null;
  averageHR?: number | null;
  averageSpeed?: number | null;
  elevationGain?: number | null;
  calories?: number | null;
}

interface GarminActivityDetail {
  isMultiSportParent?: boolean;
  metadataDTO?: {
    childIds?: number[];
    childActivityTypes?: string[];
  };
  summaryDTO?: GarminActivitySummaryDTO;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
}

function durationSec(v: unknown): number | null {
  const n = num(v);
  if (n == null) return null;
  return n > 1_000_000 ? Math.round(n / 1000) : Math.round(n);
}

function parseChildSummary(
  garminActivityId: number,
  typeKey: string,
  summary: GarminActivitySummaryDTO | undefined,
  transitionIndex: number | null,
): MultisportLeg | null {
  const kind = mapGarminChildTypeToKind(typeKey);
  const duration = durationSec(summary?.duration);
  if (duration == null) return null;

  return {
    kind,
    label: legKindLabel(kind, transitionIndex),
    durationSec: duration,
    movingDurationSec: durationSec(summary?.movingDuration),
    distanceM: num(summary?.distance),
    avgHr: num(summary?.averageHR) ? Math.round(num(summary?.averageHR)!) : null,
    avgSpeedMs: num(summary?.averageSpeed),
    elevationM: num(summary?.elevationGain) ? Math.round(num(summary?.elevationGain)!) : null,
    calories: num(summary?.calories) ? Math.round(num(summary?.calories)!) : null,
    garminActivityId: String(garminActivityId),
    transitionIndex: kind === 'transition' ? transitionIndex : null,
  };
}

/**
 * Récupère les jambes et transitions d'une activité multisport Garmin (parent).
 * Retourne null si l'activité n'est pas un parent multisport ou si les données sont indisponibles.
 */
export async function fetchGarminMultisportLegs(
  client: GCClient,
  garminActivityId: number,
): Promise<MultisportLeg[] | null> {
  try {
    const raw = (await client.get(
      `https://connectapi.garmin.com/activity-service/activity/${garminActivityId}`,
    )) as GarminActivityDetail;

    const childIds = raw.metadataDTO?.childIds ?? [];
    const childTypes = raw.metadataDTO?.childActivityTypes ?? [];

    if (!raw.isMultiSportParent || childIds.length === 0) {
      return null;
    }

    const legs: MultisportLeg[] = [];
    let transitionCount = 0;

    for (let i = 0; i < childIds.length; i++) {
      const childId = childIds[i];
      const typeKey = childTypes[i] ?? '';
      const kind = mapGarminChildTypeToKind(typeKey);
      const transitionIndex = kind === 'transition' ? ++transitionCount : null;

      const child = (await client.get(
        `https://connectapi.garmin.com/activity-service/activity/${childId}`,
      )) as GarminActivityDetail;

      const leg = parseChildSummary(childId, typeKey, child.summaryDTO, transitionIndex);
      if (leg) legs.push(leg);
    }

    return legs.length > 0 ? legs : null;
  } catch {
    return null;
  }
}
