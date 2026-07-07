import { ArcGauge } from '@/components/ui/arc-gauge';
import { TodayDateSelector } from '@/components/today/drill-down/date-selector';
import type { RadialColorMode, RadialScoreFormat } from '@/lib/radial-gauge';
import { cn } from '@/lib/utils';
import { format as formatDate } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  return (
    <section className="px-6 py-8">
      <div className="text-center">
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
        {subtitle && (
          <p className="text-muted-foreground/80 mt-0.5 text-sm tabular-nums">{subtitle}</p>
        )}
      </div>

      <div className="mt-6 flex justify-center">
        <ArcGauge
          colorMode={colorMode}
          format={format}
          max={max}
          score={score}
          size={128}
          strokeColor={strokeColor}
          strokeWidth={8}
        />
      </div>

      <div className="mt-4 text-center">
        <p
          className={cn(
            'flex items-center justify-center gap-1 text-sm font-semibold',
            statusClassName,
          )}
        >
          {statusLabel}
        </p>
        {primaryValue && (
          <p className="mt-1 font-mono text-3xl font-semibold tracking-tight tabular-nums">
            {primaryValue}
          </p>
        )}
        {primaryCaption && <p className="text-muted-foreground mt-1 text-xs">{primaryCaption}</p>}
        {badge && <div className="mt-3 flex justify-center">{badge}</div>}
        {meta && <div className="text-muted-foreground mt-2 space-y-0.5 text-xs">{meta}</div>}
      </div>
    </section>
  );
}
