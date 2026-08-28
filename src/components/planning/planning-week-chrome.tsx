'use client';

import { TravelContextBanner } from '@/components/planning/travel-context-banner';
import { SessionsCoachMenu, type SessionsCoachAction } from '@/components/coaching/coach-menu';
import { Button } from '@/components/ui/button';
import { addWeeks, format, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, GitCompare } from 'lucide-react';

export function PlanningWeekChrome({
  hasActionableAlternative,
  isCurrentWeek,
  isLoading,
  showCoachMenu,
  weekEnd,
  weekIndex,
  weekStart,
  onCompareScenarios,
  onCoachAction,
  onWeekChange,
}: {
  hasActionableAlternative: boolean;
  isCurrentWeek: boolean;
  isLoading: boolean;
  showCoachMenu: boolean;
  weekEnd: Date;
  weekIndex: number;
  weekStart: Date;
  onCompareScenarios: () => void;
  onCoachAction: (action: SessionsCoachAction) => void;
  onWeekChange: (next: Date) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-1 sm:justify-start sm:gap-1">
        <Button
          aria-label="Semaine précédente"
          className="size-11 shrink-0 lg:size-9"
          size="icon"
          variant="ghost"
          onClick={() => onWeekChange(subWeeks(weekStart, 1))}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <div className="min-w-0 flex-1 text-center sm:min-w-44 sm:flex-none">
          <p className="text-sm font-medium text-balance">
            {format(weekStart, 'd MMM', { locale: fr })}
            {' — '}
            {format(weekEnd, 'd MMM', { locale: fr })}
          </p>
          {isCurrentWeek ? (
            <p className="text-primary text-xs font-medium">Semaine en cours</p>
          ) : null}
          {weekIndex > 0 ? (
            <p className="text-muted-foreground text-xs font-medium">Semaine à venir</p>
          ) : null}
        </div>
        <Button
          aria-label="Semaine suivante"
          className="size-11 shrink-0 lg:size-9"
          size="icon"
          variant="ghost"
          onClick={() => onWeekChange(addWeeks(weekStart, 1))}
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>

      <div className="flex [scrollbar-width:none] items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {!isLoading ? (
          <TravelContextBanner
            className="max-w-[9.5rem] sm:max-w-56"
            rangeEnd={weekEnd}
            rangeStart={weekStart}
          />
        ) : null}
        {hasActionableAlternative ? (
          <Button
            aria-label="Comparer les scénarios"
            className="shrink-0"
            size="sm"
            variant="outline"
            onClick={onCompareScenarios}
          >
            <GitCompare className="size-3.5 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Comparer</span>
          </Button>
        ) : null}
        {showCoachMenu ? (
          <div className="ml-auto shrink-0">
            <SessionsCoachMenu onAction={onCoachAction} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
