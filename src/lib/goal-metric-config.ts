import { ActivityType, GoalHorizon } from '@prisma/client';
import { activityTypeLabels } from '@/lib/format';

export type GoalMetricTemplate = 'performance' | 'period';

export type PeriodMeasure = 'activity_count' | 'duration' | 'distance' | 'elevation';

export type GoalPeriod = 'WEEK' | 'MONTH' | 'YEAR';

export type GoalEndMode = 'on_achieved' | 'on_date';

export interface PerformanceMetricConfig {
  v: 1;
  template: 'performance';
  sport: ActivityType;
  distanceM: number;
  endMode?: GoalEndMode;
}

export interface PeriodMetricConfig {
  v: 1;
  template: 'period';
  period: GoalPeriod;
  measure: PeriodMeasure;
  sport: ActivityType | null;
}

export type GoalMetricConfig = PerformanceMetricConfig | PeriodMetricConfig;

export interface DistancePreset {
  id: string;
  label: string;
  distanceM: number;
}

const RUN_DISTANCE_PRESETS: DistancePreset[] = [
  { id: '1k', label: '1 km', distanceM: 1000 },
  { id: '5k', label: '5 km', distanceM: 5000 },
  { id: '10k', label: '10 km', distanceM: 10000 },
  { id: 'semi', label: 'Semi-marathon', distanceM: 21097 },
  { id: 'marathon', label: 'Marathon', distanceM: 42195 },
];

const BIKE_DISTANCE_PRESETS: DistancePreset[] = [
  { id: '40k', label: '40 km', distanceM: 40000 },
  { id: '90k', label: '90 km', distanceM: 90000 },
  { id: '180k', label: '180 km', distanceM: 180000 },
];

const SWIM_DISTANCE_PRESETS: DistancePreset[] = [
  { id: '500m', label: '500 m', distanceM: 500 },
  { id: '1k', label: '1 km', distanceM: 1000 },
  { id: '1900m', label: '1 900 m', distanceM: 1900 },
  { id: '3800m', label: '3 800 m', distanceM: 3800 },
];

export const performanceSports: ActivityType[] = [
  ActivityType.RUN,
  ActivityType.BIKE,
  ActivityType.SWIM,
];

export function distancePresetsForSport(sport: ActivityType): DistancePreset[] {
  switch (sport) {
    case ActivityType.RUN:
      return RUN_DISTANCE_PRESETS;
    case ActivityType.BIKE:
      return BIKE_DISTANCE_PRESETS;
    case ActivityType.SWIM:
      return SWIM_DISTANCE_PRESETS;
    default:
      return [];
  }
}

export const periodLabels: Record<GoalPeriod, string> = {
  WEEK: 'Chaque semaine',
  MONTH: 'Chaque mois',
  YEAR: 'Chaque année',
};

export const performanceEndModeLabels: Record<GoalEndMode, string> = {
  on_achieved: "Quand l'objectif est atteint",
  on_date: 'À une date limite',
};

export const periodHorizon: Record<GoalPeriod, GoalHorizon> = {
  WEEK: GoalHorizon.WEEKLY,
  MONTH: GoalHorizon.MONTHLY,
  YEAR: GoalHorizon.YEARLY,
};

export const measureLabels: Record<PeriodMeasure, string> = {
  activity_count: "Nombre d'activités",
  duration: 'Temps total',
  distance: 'Distance',
  elevation: 'Dénivelé',
};

export function parseGoalMetricConfig(
  metricKey: string | null | undefined,
): GoalMetricConfig | null {
  if (!metricKey) return null;
  try {
    const parsed = JSON.parse(metricKey) as GoalMetricConfig;
    if (parsed?.v !== 1 || !parsed.template) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function serializeGoalMetricConfig(config: GoalMetricConfig): string {
  return JSON.stringify(config);
}

export function buildPerformanceGoalFields(
  config: PerformanceMetricConfig,
  targetSeconds: number,
  endMode: GoalEndMode = config.endMode ?? 'on_achieved',
) {
  const distLabel = formatDistanceLabel(config.distanceM);
  return {
    title: `${distLabel} en ${formatChronoSeconds(targetSeconds)}`,
    metricKey: serializeGoalMetricConfig({ ...config, endMode }),
    horizon: GoalHorizon.MEDIUM_TERM,
    targetValue: targetSeconds,
    unit: 'chrono',
    lowerIsBetter: true,
    startValue: null as number | null,
    currentValue: null as number | null,
    endMode,
  };
}

export function buildPeriodGoalFields(
  config: PeriodMetricConfig,
  target: number,
  customTitle?: string | null,
) {
  const sportPart =
    config.sport != null ? activityTypeLabels[config.sport].toLowerCase() : 'tous sports';
  const measurePart = measureLabels[config.measure].toLowerCase();
  const defaultTitle = `${periodLabels[config.period]} — ${measurePart} (${sportPart})`;

  return {
    title: customTitle?.trim() || defaultTitle,
    metricKey: serializeGoalMetricConfig(config),
    horizon: periodHorizon[config.period],
    targetValue: target,
    unit: unitForMeasure(config.measure),
    lowerIsBetter: false,
    startValue: 0,
    currentValue: null as number | null,
  };
}

export function unitForMeasure(measure: PeriodMeasure): string {
  switch (measure) {
    case 'activity_count':
      return 'séances';
    case 'duration':
      return 'h';
    case 'distance':
      return 'km';
    case 'elevation':
      return 'm';
  }
}

export function formatDistanceLabel(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    return Number.isInteger(km) ? `${km} km` : `${km.toFixed(1)} km`;
  }
  return `${meters} m`;
}

export function formatChronoSeconds(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—';
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function parseChronoInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(':').map((p) => p.trim());
  if (parts.some((p) => p === '' || Number.isNaN(Number(p)))) return null;
  if (parts.length === 2) {
    const [m, s] = parts.map(Number);
    return m * 60 + s;
  }
  if (parts.length === 3) {
    const [h, m, s] = parts.map(Number);
    return h * 3600 + m * 60 + s;
  }
  return null;
}

export function formatGoalDisplayValue(
  value: number | null,
  unit: string | null,
  config: GoalMetricConfig | null,
): string {
  if (value == null) return '—';
  if (unit === 'chrono' || config?.template === 'performance') {
    return formatChronoSeconds(value);
  }
  if (unit === 'h') {
    const h = value / 3600;
    return h >= 10 ? `${Math.round(h)} h` : `${h.toFixed(1)} h`;
  }
  if (unit === 'km') {
    const km = value / 1000;
    return km >= 100 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
  }
  if (unit === 'm') return `${Math.round(value)} m`;
  if (unit === 'séances') return `${Math.round(value)} séance${value > 1 ? 's' : ''}`;
  return unit ? `${value} ${unit}` : String(value);
}

export function inferPerformanceEndMode(
  config: PerformanceMetricConfig,
  targetDate: string | Date | null | undefined,
): GoalEndMode {
  if (config.endMode) return config.endMode;
  return targetDate ? 'on_date' : 'on_achieved';
}

export function describeMetricGoal(
  config: GoalMetricConfig | null,
  targetDate?: string | Date | null,
): string | null {
  if (!config) return null;
  if (config.template === 'performance') {
    const end =
      inferPerformanceEndMode(config, targetDate) === 'on_date' && targetDate
        ? ` · jusqu'au ${formatGoalEndDate(targetDate)}`
        : '';
    return `${activityTypeLabels[config.sport]} · ${formatDistanceLabel(config.distanceM)}${end}`;
  }
  const sport = config.sport != null ? activityTypeLabels[config.sport] : 'Tous sports';
  const end = targetDate ? ` · jusqu'au ${formatGoalEndDate(targetDate)}` : '';
  return `${periodLabels[config.period]} · ${measureLabels[config.measure]} · ${sport}${end}`;
}

export function formatGoalEndDate(value: string | Date): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatAchievementPeriodKey(periodKey: string): string | null {
  if (periodKey === '_performance') return null;
  const week = periodKey.match(/^(\d{4})-W(\d{2})$/);
  if (week) return `Semaine ${week[2]} · ${week[1]}`;
  const month = periodKey.match(/^(\d{4})-(\d{2})$/);
  if (month) {
    const d = new Date(Number(month[1]), Number(month[2]) - 1, 1);
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(d);
  }
  if (/^\d{4}$/.test(periodKey)) return `Année ${periodKey}`;
  return periodKey;
}

export function isGoalExpired(
  targetDate: string | Date | null | undefined,
  ref = new Date(),
): boolean {
  if (!targetDate) return false;
  const end = new Date(targetDate);
  if (Number.isNaN(end.getTime())) return false;
  end.setHours(23, 59, 59, 999);
  return ref > end;
}

/** Convertit la saisie utilisateur (km, h, etc.) en valeur stockée. */
export function parseTargetInput(measure: PeriodMeasure, raw: string): number | null {
  const n = Number(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  switch (measure) {
    case 'activity_count':
      return Math.round(n);
    case 'duration':
      return Math.round(n * 3600);
    case 'distance':
      return Math.round(n * 1000);
    case 'elevation':
      return Math.round(n);
  }
}

export function targetInputFromStored(measure: PeriodMeasure, stored: number | null): string {
  if (stored == null) return '';
  switch (measure) {
    case 'activity_count':
      return String(Math.round(stored));
    case 'duration':
      return String(Math.round((stored / 3600) * 10) / 10);
    case 'distance':
      return String(Math.round((stored / 1000) * 10) / 10);
    case 'elevation':
      return String(Math.round(stored));
  }
}
