'use client';

import type { ReactElement } from 'react';
import { ResponsiveChartFrame } from '@/components/ui/responsive-chart-frame';
import { describeChart, type ChartSeries } from '@/lib/ui/chart-description';

/**
 * A chart with a text alternative.
 *
 * `ResponsiveChartFrame` alone renders an SVG with no accessible name, so the
 * analysis pages announced nothing where a sighted athlete reads a 28-day
 * trend. This wraps the figure with a spoken summary and a hidden data table —
 * the tooltip is hover-only, so the table is also the only way to reach exact
 * values without a pointer.
 */
export function ChartFigure({
  title,
  series,
  height,
  children,
  className,
}: {
  /** Section title the chart belongs to, e.g. "Charge vs forme — 28 jours". */
  title: string;
  series: ChartSeries[];
  height: number;
  children: ReactElement;
  className?: string;
}) {
  const description = describeChart(title, series);
  const labels = series[0]?.points.map((p) => p.label) ?? [];

  return (
    <figure className={className}>
      <div aria-label={description} role="img">
        <ResponsiveChartFrame height={height}>{children}</ResponsiveChartFrame>
      </div>
      <figcaption className="sr-only">
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              {series.map((s) => (
                <th key={s.name} scope="col">
                  {s.name}
                  {s.unit ? ` (${s.unit})` : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((label, i) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {series.map((s) => (
                  <td key={s.name}>{s.points[i]?.value ?? '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
