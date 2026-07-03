export type ChartLayoutMode = 'mobile' | 'desktop';

export interface ChartDimensions {
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  tickFontSize: number;
  showLegend: boolean;
}

const CHART_LAYOUTS: Record<ChartLayoutMode, ChartDimensions> = {
  mobile: {
    height: 140,
    margin: { top: 4, right: 4, bottom: 0, left: -20 },
    tickFontSize: 10,
    showLegend: false,
  },
  desktop: {
    height: 200,
    margin: { top: 4, right: 4, bottom: 0, left: -24 },
    tickFontSize: 11,
    showLegend: true,
  },
};

export function getChartDimensions(mode: ChartLayoutMode): ChartDimensions {
  return CHART_LAYOUTS[mode];
}

export function useChartDimensions(mode: ChartLayoutMode): ChartDimensions {
  return CHART_LAYOUTS[mode];
}
