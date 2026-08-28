import type { ClientPlanWeek } from '@/lib/query/types';
import { formatTrainingLoad } from '@/lib/preferences/display-mode';
import type { DisplayMode } from '@/lib/preferences/display-mode';

function weeksToRaceLabel(weeksToRace: number): string {
  return weeksToRace === 0 ? 'Semaine course' : `S-${weeksToRace}`;
}

function planWeekSummarySegments(
  mode: DisplayMode,
  planWeek: ClientPlanWeek,
  plannedLoad: number,
): string[] {
  const phase = `${planWeek.phase}${planWeek.isDeload ? ' · deload' : ''}`;
  const loadText =
    plannedLoad > 0
      ? `${formatTrainingLoad(plannedLoad, mode)} / ${formatTrainingLoad(planWeek.targetLoad, mode)}`
      : `${formatTrainingLoad(planWeek.targetLoad, mode)} cible`;
  return [phase, loadText];
}

export function buildWeekSummarySegments({
  mode,
  planWeek,
  plannedLoad,
  total,
  weeksToRace,
}: {
  mode: DisplayMode;
  planWeek?: ClientPlanWeek;
  plannedLoad: number;
  total: number;
  weeksToRace: number | null;
}): string[] {
  const segments: string[] = [];
  const showWeeksToRace = weeksToRace !== null && weeksToRace >= 0;

  if (showWeeksToRace) {
    segments.push(weeksToRaceLabel(weeksToRace));
  }

  if (planWeek) {
    segments.push(...planWeekSummarySegments(mode, planWeek, plannedLoad));
  } else if (total > 0) {
    const plural = total > 1;
    segments.push(`${total} séance${plural ? 's' : ''} planifiée${plural ? 's' : ''}`);
  }

  return segments;
}
