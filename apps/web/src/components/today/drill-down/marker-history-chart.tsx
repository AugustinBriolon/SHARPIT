'use client';

import { useMemo, useState } from 'react';
import { buildSparkPaths } from '@/components/today/dashboard/sparkline';
import { cn } from '@/lib/utils';
import {
  MARKER_HISTORY_VIEW,
  nearestReadable,
  positionOfIndex,
  verticalOfValue,
} from '@/components/today/drill-down/marker-history-chart-helpers';

export type MarkerHistoryPoint = { label: string; value: number | null };

function MarkerHistoryReadout({
  active,
  activeValue,
  unit,
}: {
  active: MarkerHistoryPoint | undefined;
  activeValue: number | null;
  unit: string;
}) {
  return (
    <div className="text-muted-foreground flex items-baseline justify-between gap-3 text-xs">
      <span>{active?.label ?? '—'}</span>
      <span className="text-data text-foreground tabular-nums">
        {activeValue !== null ? `${activeValue} ${unit}` : 'Pas de mesure'}
      </span>
    </div>
  );
}

function MarkerHistoryCursor({
  activeIndex,
  activeValue,
  pointCount,
  low,
  high,
}: {
  activeIndex: number;
  activeValue: number;
  pointCount: number;
  low: number;
  high: number;
}) {
  return (
    <>
      <div
        className="bg-primary/40 absolute inset-y-0 w-px"
        style={{ left: `${positionOfIndex(activeIndex, pointCount)}%` }}
        aria-hidden
      />
      <div
        className={cn(
          'bg-primary border-background absolute size-2.5 rounded-full border-2',
          '-translate-x-1/2 -translate-y-1/2',
        )}
        style={{
          left: `${positionOfIndex(activeIndex, pointCount)}%`,
          top: `${verticalOfValue(activeValue, low, high)}%`,
        }}
        aria-hidden
      />
    </>
  );
}

function MarkerHistorySlider({
  points,
  unit,
  line,
  area,
  activeIndex,
  active,
  activeValue,
  low,
  high,
  onMoveTo,
  onClearHover,
}: {
  points: MarkerHistoryPoint[];
  unit: string;
  line: string;
  area: string;
  activeIndex: number | null;
  active: MarkerHistoryPoint | undefined;
  activeValue: number | null;
  low: number;
  high: number;
  onMoveTo: (index: number) => void;
  onClearHover: () => void;
}) {
  return (
    <>
      <MarkerHistoryReadout active={active} activeValue={activeValue} unit={unit} />
      <div
        aria-label="Historique jour par jour"
        aria-valuemax={points.length - 1}
        aria-valuemin={0}
        aria-valuenow={activeIndex ?? 0}
        className="focus-visible:outline-ring rounded-analysis relative mt-1.5 h-14 w-full touch-none focus-visible:outline-2 focus-visible:outline-offset-2"
        role="slider"
        tabIndex={0}
        aria-valuetext={
          active ? `${active.label} · ${activeValue ?? 'pas de mesure'} ${unit}` : undefined
        }
        onBlur={onClearHover}
        onPointerLeave={onClearHover}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            onMoveTo((activeIndex ?? points.length - 1) - 1);
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            onMoveTo((activeIndex ?? 0) + 1);
          }
        }}
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (bounds.width <= 0) {
            return;
          }
          const ratio = (event.clientX - bounds.left) / bounds.width;
          onMoveTo(Math.round(ratio * (points.length - 1)));
        }}
      >
        <svg
          className="text-muted-foreground absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          viewBox={`0 0 ${MARKER_HISTORY_VIEW.VIEW_W} ${MARKER_HISTORY_VIEW.VIEW_H}`}
          aria-hidden
        >
          <path d={area} fill="currentColor" fillOpacity={0.12} />
          <path
            d={line}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {activeIndex !== null && activeValue !== null ? (
          <MarkerHistoryCursor
            activeIndex={activeIndex}
            activeValue={activeValue}
            high={high}
            low={low}
            pointCount={points.length}
          />
        ) : null}
      </div>
    </>
  );
}

export function MarkerHistoryChart({
  points,
  unit,
  className,
}: {
  points: MarkerHistoryPoint[];
  unit: string;
  className?: string;
}) {
  const values = useMemo(() => points.map((point) => point.value), [points]);
  const readable = useMemo(
    () => values.filter((value): value is number => value !== null),
    [values],
  );

  const lastReadable = useMemo(() => nearestReadable(points, points.length - 1), [points]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { line, area } = useMemo(
    () => buildSparkPaths(values, MARKER_HISTORY_VIEW.VIEW_W, MARKER_HISTORY_VIEW.VIEW_H),
    [values],
  );

  if (!line || readable.length < 2) {
    return null;
  }

  const low = Math.min(...readable);
  const high = Math.max(...readable);
  const activeIndex = hoverIndex ?? lastReadable;
  const active = activeIndex !== null ? points[activeIndex] : undefined;
  const activeValue = active?.value ?? null;

  const moveTo = (index: number) => {
    const clamped = Math.min(points.length - 1, Math.max(0, index));
    setHoverIndex(nearestReadable(points, clamped) ?? clamped);
  };

  return (
    <div className={className}>
      <MarkerHistorySlider
        active={active}
        activeIndex={activeIndex}
        activeValue={activeValue}
        area={area}
        high={high}
        line={line}
        low={low}
        points={points}
        unit={unit}
        onClearHover={() => setHoverIndex(null)}
        onMoveTo={moveTo}
      />
    </div>
  );
}
