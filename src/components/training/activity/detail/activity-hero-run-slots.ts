import { formatDistance, formatPace } from '@/lib/format';
import type { HeroActivity } from '@/components/training/activity/detail/activity-hero-stats';
import type { HeroStatSlot } from '@/components/training/activity/detail/activity-hero-run-slots';

type StreamStats = { avgHr: number | null };

function runDistanceSlot(m: HeroActivity['runMetrics']): HeroStatSlot {
  return {
    label: 'Distance',
    value: m?.distanceM !== null ? formatDistance(m.distanceM) : null,
  };
}

function runPaceSlot(m: HeroActivity['runMetrics']): HeroStatSlot {
  return {
    label: 'Allure',
    value: m?.paceSecPerKm !== null ? formatPace(m.paceSecPerKm) : null,
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
  return {
    label: 'Cadence',
    value: m?.cadence !== null ? `${m.cadence} spm` : null,
  };
}

export function buildRunHeroSlots(
  activity: HeroActivity,
  stream: StreamStats | null,
): HeroStatSlot[] {
  const m = activity.runMetrics;
  return [runDistanceSlot(m), runPaceSlot(m), runHrSlot(m, stream), runCadenceSlot(m)];
}
