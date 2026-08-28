import { formatDistance, formatPace } from '@/lib/format';
import type { HeroActivity } from '@/components/training/activity/detail/activity-hero-stats';

export type HeroStatSlot = {
  label: string;
  value: string | null;
  needsStream?: boolean;
};

type StreamStats = { avgHr: number | null };

function runDistanceSlot(m: HeroActivity['runMetrics']): HeroStatSlot {
  const distanceM = m?.distanceM ?? null;
  return {
    label: 'Distance',
    value: distanceM !== null ? formatDistance(distanceM) : null,
  };
}

function runPaceSlot(m: HeroActivity['runMetrics']): HeroStatSlot {
  const paceSecPerKm = m?.paceSecPerKm ?? null;
  return {
    label: 'Allure',
    value: paceSecPerKm !== null ? formatPace(paceSecPerKm) : null,
  };
}

function runHrSlot(m: HeroActivity['runMetrics'], stream: StreamStats | null): HeroStatSlot {
  const avgHr = m?.avgHr ?? stream?.avgHr ?? null;
  return {
    label: 'FC moy.',
    value: avgHr !== null ? `${avgHr} bpm` : null,
    needsStream: m?.avgHr === null,
  };
}

function runCadenceSlot(m: HeroActivity['runMetrics']): HeroStatSlot {
  const cadence = m?.cadence ?? null;
  return {
    label: 'Cadence',
    value: cadence !== null ? `${cadence} spm` : null,
  };
}

export function buildRunHeroSlots(
  activity: HeroActivity,
  stream: StreamStats | null,
): HeroStatSlot[] {
  const m = activity.runMetrics;
  return [runDistanceSlot(m), runPaceSlot(m), runHrSlot(m, stream), runCadenceSlot(m)];
}
