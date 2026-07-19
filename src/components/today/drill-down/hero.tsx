import { TodayDateSelector } from '@/components/today/drill-down/date-selector';
import {
  formatRadialValue,
  resolveRadialStrokeColor,
  type RadialColorMode,
  type RadialScoreFormat,
} from '@/lib/radial-gauge';
import { cn } from '@/lib/utils';
import { format as formatDate } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PhysioRail } from '@/components/ui/physio-rail';

export function DrillDownHero({
  date,
  subtitle,
  score,
  colorMode = 'dynamic',
  format = 'number',
  max = 100,
  strokeColor,
  statusLabel,
  statusClassName,
  primaryValue,
  primaryCaption,
  badge,
  meta,
  onDateChange,
  onPreviousDay,
  onNextDay,
  isToday = true,
  maxDate,
}: {
  date: Date;
  subtitle?: string | null;
  score: number | null;
  colorMode?: RadialColorMode;
  format?: RadialScoreFormat;
  max?: number;
  strokeColor?: string;
  statusLabel: string;
  statusClassName: string;
  primaryValue?: string | null;
  primaryCaption?: string;
  badge?: React.ReactNode;
  meta?: React.ReactNode;
  onDateChange?: (date: Date) => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  isToday?: boolean;
  maxDate?: Date;
}) {
  const displayScore = formatRadialValue(score, format);
  const scoreSuffix = format === 'percent' && score !== null ? '%' : '';
  const accent =
    strokeColor ?? resolveRadialStrokeColor(score, colorMode === 'dynamic' ? 'dynamic' : colorMode);

  return (
    <section className="analysis-panel-alt rounded-analysis-lg px-5 py-5 sm:px-6">
      <div className="space-y-1">
        {onDateChange && onPreviousDay && onNextDay && maxDate ? (
          <TodayDateSelector
            date={date}
            isToday={isToday}
            maxDate={maxDate}
            onChange={onDateChange}
            onNextDay={onNextDay}
            onPreviousDay={onPreviousDay}
          />
        ) : (
          <p className="text-muted-foreground text-xs capitalize">
            {formatDate(date, 'EEEE d MMMM', { locale: fr })}
          </p>
        )}
        {subtitle ? (
          <p className="text-muted-foreground/80 text-sm tabular-nums">{subtitle}</p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className={cn('text-sm font-semibold', statusClassName)}>{statusLabel}</p>
          {primaryValue ? (
            <p className="text-instrument text-foreground text-3xl tabular-nums">{primaryValue}</p>
          ) : (
            <p
              className="text-instrument text-foreground text-3xl tabular-nums"
              style={{ color: accent }}
            >
              {displayScore}
              {scoreSuffix ? (
                <span className="text-muted-foreground ml-1 text-base font-normal">
                  {scoreSuffix}
                </span>
              ) : null}
            </p>
          )}
          {primaryCaption ? (
            <p className="text-muted-foreground text-xs">{primaryCaption}</p>
          ) : null}
        </div>
        <div className="w-full max-w-xs shrink-0 sm:w-56">
          <PhysioRail
            max={max}
            size="slim"
            value={score}
            variant={colorMode === 'strain' ? 'intensity' : 'availability'}
          />
        </div>
      </div>

      {badge ? <div className="mt-3">{badge}</div> : null}
      {meta ? <div className="text-muted-foreground mt-2 space-y-0.5 text-xs">{meta}</div> : null}
    </section>
  );
}
