'use client';

import { ActivityFeelingChip } from '@/components/training/activity/detail/activity-feeling-chip';
import { ActivityFeelingPrompt } from '@/components/training/activity/detail/activity-feeling-prompt';
import { ActivityPlannedSessionChip } from '@/components/training/activity/detail/activity-planned-session-chip';
import { ActivityWeatherChip } from '@/components/training/activity/detail/activity-weather-chip';
import { useActivityHeaderEvaluations } from '@/components/training/activity/detail/use-activity-header-evaluations';
import type { PlannedSessionSummary } from '@/components/training/activity/detail/types';
import type { ActivityType } from '@prisma/client';
import { isIndoorActivitySession } from '@/lib/activity/location/indoor-activity';
import { parseActivityWeather } from '@/lib/activity/weather/activity-weather';

function resolveWeatherChipVisibility({
  activityType,
  activityTitle,
  weather,
}: {
  activityType: ActivityType;
  activityTitle: string | null;
  weather: string | null;
}) {
  if (isIndoorActivitySession({ type: activityType, title: activityTitle })) {
    return false;
  }
  return Boolean(parseActivityWeather(weather));
}

function resolveHeaderChipVisibility({
  feeling,
  rpe,
  plannedSession,
}: {
  feeling: string | null;
  rpe: number | null;
  plannedSession: PlannedSessionSummary | null;
}) {
  const hasFeeling = Boolean(feeling?.trim());
  const showFeelingPrompt = rpe === null && !hasFeeling;
  const showConformity = Boolean(plannedSession);
  return {
    hasFeeling,
    showFeelingPrompt,
    showConformity,
    visible: hasFeeling || showFeelingPrompt || showConformity,
  };
}

export function ActivityHeaderContextChips({
  activityId,
  activityType,
  activityTitle,
  weather,
  feeling,
  rpe,
  plannedSession,
  plannedAnalysisReady,
}: {
  activityId: string;
  activityType: ActivityType;
  activityTitle: string | null;
  weather: string | null;
  feeling: string | null;
  rpe: number | null;
  plannedSession: PlannedSessionSummary | null;
  plannedAnalysisReady: boolean;
}) {
  const evaluations = useActivityHeaderEvaluations(activityId, { feeling, rpe });
  const chips = resolveHeaderChipVisibility({
    feeling: evaluations.feeling,
    rpe: evaluations.rpe,
    plannedSession,
  });
  const showWeather = resolveWeatherChipVisibility({
    activityType,
    activityTitle,
    weather,
  });

  if (!chips.visible && !showWeather) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      {chips.hasFeeling ? (
        <ActivityFeelingChip
          activityId={activityId}
          feeling={evaluations.feeling!}
          rpe={evaluations.rpe}
        />
      ) : null}
      {chips.showFeelingPrompt ? <ActivityFeelingPrompt activityId={activityId} /> : null}
      {chips.showConformity && plannedSession ? (
        <ActivityPlannedSessionChip
          activityId={activityId}
          isAnalyzing={!plannedAnalysisReady}
          planned={plannedSession}
        />
      ) : null}
      {showWeather ? (
        <ActivityWeatherChip activity={{ type: activityType, title: activityTitle, weather }} />
      ) : null}
    </div>
  );
}
