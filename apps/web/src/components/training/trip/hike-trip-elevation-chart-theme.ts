import {
  CHART_GRID_COLOR,
  CHART_INK_GRID_COLOR,
  CHART_INK_STROKE,
  CHART_PRIMARY_STROKE,
  CHART_TICK_COLOR,
} from '@/lib/theme/chart-theme';

export function resolveHikeElevationChartTheme(onInk: boolean) {
  return {
    formatTick: (value: number) => value.toString(),
    stroke: onInk ? CHART_INK_STROKE : CHART_PRIMARY_STROKE,
    gridColor: onInk ? CHART_INK_GRID_COLOR : CHART_GRID_COLOR,
    tickColor: onInk ? 'currentColor' : CHART_TICK_COLOR,
    fillOpacity: onInk ? 0.18 : 0.12,
  };
}
