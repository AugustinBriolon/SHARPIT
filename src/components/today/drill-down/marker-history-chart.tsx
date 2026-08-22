'use client';

import { useMemo, useState } from 'react';
import { buildSparkPaths } from '@/components/today/dashboard/sparkline';
import { cn } from '@/lib/utils';

export type MarkerHistoryPoint = { label: string; value: number | null };

const VIEW_W = 200;
const VIEW_H = 56;
const PAD = 2;

/** Same geometry `buildSparkPaths` uses, so the marker lands on the drawn line. */
function positionOfIndex(index: number, count: number): number {
  if (count <= 1) return 50;
  return ((PAD + (index / (count - 1)) * (VIEW_W - PAD * 2)) / VIEW_W) * 100;
}

function verticalOfValue(value: number, low: number, high: number): number {
  const span = high - low || 1;
  return ((VIEW_H - PAD - ((value - low) / span) * (VIEW_H - PAD * 2)) / VIEW_H) * 100;
}

/** Nearest readable point to `from`, so hovering a gap still reads something. */
function nearestReadable(points: MarkerHistoryPoint[], from: number): number | null {
  for (let offset = 0; offset < points.length; offset += 1) {
    const before = from - offset;
    const after = from + offset;
    if (before >= 0 && points[before]?.value != null) return before;
    if (after < points.length && points[after]?.value != null) return after;
  }
  return null;
}

/**
 * Fourteen days of one marker, readable point by point.
 *
 * A sparkline shows a shape and refuses to say what any day actually measured,
 * which is the question that follows "is this new?". Pointer or arrow keys move a
 * cursor along the series and the readout above names the day and its value —
 * above the curve rather than floating over it, so nothing is covered by the
 * thing meant to explain it, and the line never reflows as the numbers change
 * width.
 */
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
    () => values.filter((value): value is number => value != null),
    [values],
  );

  const lastReadable = useMemo(() => nearestReadable(points, points.length - 1), [points]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { line, area } = useMemo(() => buildSparkPaths(values, VIEW_W, VIEW_H), [values]);
  if (!line || readable.length < 2) return null;

  const low = Math.min(...readable);
  const high = Math.max(...readable);

  const activeIndex = hoverIndex ?? lastReadable;
  const active = activeIndex != null ? points[activeIndex] : undefined;
  const activeValue = active?.value ?? null;

  const moveTo = (index: number) => {
    const clamped = Math.min(points.length - 1, Math.max(0, index));
    setHoverIndex(nearestReadable(points, clamped) ?? clamped);
  };

  return (
    <div className={className}>
      <div className="text-muted-foreground flex items-baseline justify-between gap-3 text-xs">
        <span>{active?.label ?? '—'}</span>
        <span className="text-data text-foreground tabular-nums">
          {activeValue != null ? `${activeValue} ${unit}` : 'pas de mesure'}
        </span>
      </div>

      <div
        aria-label="Historique jour par jour"
        aria-valuemax={points.length - 1}
        aria-valuemin={0}
        aria-valuenow={activeIndex ?? 0}
        className="focus-visible:outline-ring relative mt-1.5 h-14 w-full touch-none rounded focus-visible:outline-2 focus-visible:outline-offset-2"
        role="slider"
        tabIndex={0}
        aria-valuetext={
          active ? `${active.label} · ${activeValue ?? 'pas de mesure'} ${unit}` : undefined
        }
        onBlur={() => setHoverIndex(null)}
        onPointerLeave={() => setHoverIndex(null)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            moveTo((activeIndex ?? points.length - 1) - 1);
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            moveTo((activeIndex ?? 0) + 1);
          }
        }}
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (bounds.width <= 0) return;
          const ratio = (event.clientX - bounds.left) / bounds.width;
          moveTo(Math.round(ratio * (points.length - 1)));
        }}
      >
        {/* The curve stretches to the container; the cursor is positioned in percent
            on top of it, so it never inherits the squash `preserveAspectRatio="none"`
            applies to the path. */}
        <svg
          className="text-muted-foreground absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
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

        {activeIndex != null && activeValue != null ? (
          <>
            <div
              className="bg-primary/40 absolute inset-y-0 w-px"
              style={{ left: `${positionOfIndex(activeIndex, points.length)}%` }}
              aria-hidden
            />
            <div
              className={cn(
                'bg-primary border-background absolute size-2.5 rounded-full border-2',
                '-translate-x-1/2 -translate-y-1/2',
              )}
              style={{
                left: `${positionOfIndex(activeIndex, points.length)}%`,
                top: `${verticalOfValue(activeValue, low, high)}%`,
              }}
              aria-hidden
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
