import { buildLoadRuler, type RulerBar } from '@/lib/training/thread/load-ruler';
import { buildThreadAdherence } from '@/lib/training/thread/thread-adherence';
import type { ThreadAdherence, ThreadWeek } from '@/lib/training/thread/thread-model';

const HUB_RULER_WINDOW = 4;

export type PlanLoadTrend = {
  bars: RulerBar[];
  adherence: ThreadAdherence;
};

/**
 * Four weeks of planned vs recorded load.
 *
 * A trend needs a comparison: one isolated bar is a figure, not a direction,
 * so the block stays absent until two weeks exist.
 */
export function buildPlanLoadTrend(weeks: readonly ThreadWeek[]): PlanLoadTrend | null {
  const bars = buildLoadRuler(weeks, HUB_RULER_WINDOW);
  if (bars.length < 2) {
    return null;
  }
  return {
    bars,
    adherence: buildThreadAdherence(weeks),
  };
}
