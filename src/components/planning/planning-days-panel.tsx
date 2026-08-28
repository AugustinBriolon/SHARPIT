'use client';

import { PlanningDayRow } from '@/components/planning/planning-day-row';
import { format } from 'date-fns';
import type { usePlanningViewData } from '@/components/planning/use-planning-view-data';

export function PlanningDaysPanel({
  data,
  onAddDay,
  onEditSession,
}: {
  data: ReturnType<typeof usePlanningViewData>;
  onAddDay: (date: Date) => void;
  onEditSession: (session: Parameters<typeof data.openPlannedSession>[0]) => void;
}) {
  return (
    <div className="analysis-panel divide-analysis-border rounded-analysis-lg divide-y overflow-hidden">
      {data.days.map((day) => {
        const dayId = format(day.date, 'yyyy-MM-dd');
        return (
          <PlanningDayRow
            key={day.date.toISOString()}
            activities={day.activities}
            date={day.date}
            goalTitleById={data.goalTitleById}
            loading={data.isLoading}
            planned={day.planned}
            riskDay={
              data.showPlanningIntelligence &&
              data.projectionQuery.data?.highestRiskTrainingDayId === dayId
            }
            onAdd={() => onAddDay(day.date)}
            onEdit={onEditSession}
            onPrefetch={data.prefetchPlannedSession}
          />
        );
      })}
    </div>
  );
}
