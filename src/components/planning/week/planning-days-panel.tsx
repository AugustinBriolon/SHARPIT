'use client';

import { useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { PlanningWeekDay } from '@/components/planning/week/planning-week-day';
import type { usePlanningViewData } from '@/components/planning/view/use-planning-view-data';
import {
  planningDayKey,
  resolveSelectedPlanningDayId,
} from '@/lib/planning/planning-day-selection';
import type { ClientActivity } from '@/lib/query/types';

export function PlanningDaysPanel({
  data,
  onAddDay,
  onEditSession,
}: {
  data: ReturnType<typeof usePlanningViewData>;
  onAddDay: (date: Date) => void;
  onEditSession: (session: Parameters<typeof data.openPlannedSession>[0]) => void;
}) {
  const weekKey = format(data.weekStart, 'yyyy-MM-dd');
  const deepLinkDayId = data.deepLinkSession
    ? planningDayKey(new Date(data.deepLinkSession.date))
    : null;
  const riskDayId =
    data.showPlanningIntelligence && data.projectionQuery.data?.highestRiskTrainingDayId
      ? data.projectionQuery.data.highestRiskTrainingDayId
      : null;

  const activityById = useMemo(() => {
    const map = new Map<string, ClientActivity>();
    for (const activity of data.week.activities) {
      map.set(activity.id, activity);
    }
    return map;
  }, [data.week.activities]);

  const focusDayId = resolveSelectedPlanningDayId(data.days, {
    today: new Date(),
    preferredDayId: deepLinkDayId,
  });
  const scrolledForWeek = useRef<string | null>(null);

  useEffect(() => {
    const scrollKey = `${weekKey}:${focusDayId}`;
    if (scrolledForWeek.current === scrollKey) {
      return;
    }
    scrolledForWeek.current = scrollKey;
    const node = document.getElementById(focusDayId);
    node?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [weekKey, focusDayId]);

  return (
    <div className="space-y-5">
      {data.days.map((day) => {
        const dayId = planningDayKey(day.date);
        return (
          <PlanningWeekDay
            key={day.date.toISOString()}
            activities={day.activities}
            activityById={activityById}
            date={day.date}
            loading={data.isLoading}
            planned={day.planned}
            riskDay={riskDayId === dayId}
            onAdd={() => onAddDay(day.date)}
            onEdit={onEditSession}
            onPrefetch={data.prefetchPlannedSession}
          />
        );
      })}
    </div>
  );
}
