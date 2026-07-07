import { DrillDownHero } from '@/components/today/drill-down/hero';
import { mapFatigueTypeToLabel, type FatigueType } from '@/lib/today-mapping';

const DAILY_LOAD_GAUGE_MAX = 300;

function mapDailyLoadToDisplay(dailyLoad: number) {
  if (dailyLoad >= 220)
    return { label: 'Très élevé', colorClass: 'text-red-600', strokeColor: '#dc2626' };
  if (dailyLoad >= 140)
    return { label: 'Élevé', colorClass: 'text-orange-600', strokeColor: '#ea580c' };
  if (dailyLoad >= 80)
    return { label: 'Soutenu', colorClass: 'text-amber-600', strokeColor: '#d97706' };
  if (dailyLoad >= 30)
    return { label: 'Modéré', colorClass: 'text-emerald-600', strokeColor: '#059669' };
  if (dailyLoad > 0) return { label: 'Léger', colorClass: 'text-blue-600', strokeColor: '#2563eb' };
  return { label: 'Repos', colorClass: 'text-muted-foreground', strokeColor: '#94a3b8' };
}

export function EffortHero({
  date,
  dailyLoad,
  fatigueType,
  performancePercent,
  consecutiveDays,
  estimatedDaysToFresh,
  onDateChange,
  onPreviousDay,
  onNextDay,
  isToday,
  maxDate,
}: {
  date: Date;
  dailyLoad: number;
  fatigueType: FatigueType | string;
  performancePercent: number | null;
  consecutiveDays: number;
  estimatedDaysToFresh: number | null;
  onDateChange?: (date: Date) => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  isToday?: boolean;
  maxDate?: Date;
}) {
  const fatigueTypeLabel = mapFatigueTypeToLabel(fatigueType as FatigueType);
  const loadDisplay = mapDailyLoadToDisplay(dailyLoad);

  return (
    <DrillDownHero
      colorMode="neutral"
      date={date}
      format="number"
      isToday={isToday}
      max={DAILY_LOAD_GAUGE_MAX}
      maxDate={maxDate}
      score={dailyLoad}
      statusClassName={loadDisplay.colorClass}
      statusLabel={loadDisplay.label}
      strokeColor={loadDisplay.strokeColor}
      subtitle={dailyLoad > 0 ? 'effort réalisé ce jour' : 'aucun effort détecté ce jour'}
      meta={
        <>
          {fatigueTypeLabel && fatigueType !== 'UNDETERMINED' && (
            <p>
              Type : <span className="text-foreground font-medium">{fatigueTypeLabel}</span>
            </p>
          )}
          {performancePercent != null && performancePercent < 100 && (
            <p>
              Capacité : <span className="text-foreground font-medium">~{performancePercent}%</span>
            </p>
          )}
          {consecutiveDays > 0 && (
            <p className="font-medium text-amber-600">
              {consecutiveDays}j d&apos;accumulation consécutifs
            </p>
          )}
          {estimatedDaysToFresh != null && estimatedDaysToFresh > 0 && (
            <p>
              Frais dans{' '}
              <span className="text-foreground font-medium">
                {estimatedDaysToFresh === 1 ? '1 jour' : `${estimatedDaysToFresh} jours`}
              </span>
            </p>
          )}
        </>
      }
      onDateChange={onDateChange}
      onNextDay={onNextDay}
      onPreviousDay={onPreviousDay}
    />
  );
}
