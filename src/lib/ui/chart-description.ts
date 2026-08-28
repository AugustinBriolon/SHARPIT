/**
 * Text alternatives for the analysis charts.
 *
 * The recharts figures on the recovery / adaptation / effort pages carry no
 * accessible name and no fallback, so a screen reader announces nothing at all
 * where a sighted athlete reads a 28-day trend. These helpers turn a series into
 * a sentence and a table, which is the substance the chart conveys.
 */

export type ChartSeriesPoint = {
  /** X-axis label as displayed, e.g. "12 août" or "S32". */
  label: string;
  value: number | null;
};

export type ChartSeries = {
  /** Series name as shown in the legend, e.g. "Forme chronique". */
  name: string;
  points: ChartSeriesPoint[];
  /** Unit appended to values in the summary, e.g. "TSS" or "ms". */
  unit?: string;
};

function definedValues(points: readonly ChartSeriesPoint[]): number[] {
  return points.map((p) => p.value).filter((v): v is number => v !== null);
}

function formatValue(value: number, unit?: string): string {
  const rounded = Math.round(value * 10) / 10;
  return unit ? `${rounded} ${unit}` : String(rounded);
}

/** Direction between the first and last reading — the shape of the line. */
function trendWord(first: number, last: number): string {
  if (last > first) {
    return 'en hausse';
  }
  if (last < first) {
    return 'en baisse';
  }
  return 'stable';
}

/**
 * One-sentence summary per series: range covered, first and last reading, and
 * the extremes. This is what someone glances at a trend line to learn.
 */
export function describeChartSeries(series: ChartSeries): string {
  const values = definedValues(series.points);
  if (values.length === 0) {
    return `${series.name} : aucune donnée.`;
  }

  const first = series.points.find((p) => p.value !== null)!;
  const last = [...series.points].reverse().find((p) => p.value !== null)!;
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (values.length === 1) {
    return `${series.name} : ${formatValue(first.value!, series.unit)} le ${first.label}.`;
  }

  const direction = trendWord(first.value!, last.value!);

  return (
    `${series.name} : ${direction}, de ${formatValue(first.value!, series.unit)} (${first.label}) ` +
    `à ${formatValue(last.value!, series.unit)} (${last.label}). ` +
    `Minimum ${formatValue(min, series.unit)}, maximum ${formatValue(max, series.unit)}.`
  );
}

/** Accessible name for the whole figure: its title plus one sentence per series. */
export function describeChart(title: string, series: readonly ChartSeries[]): string {
  const described = series.map(describeChartSeries);
  return [`${title}.`, ...described].join(' ');
}
