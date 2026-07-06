export type MetricTone = 'good' | 'warn' | 'bad' | 'neutral';

export type CorpsTone = 'good' | 'moderate' | 'low' | 'neutral';

export const METRIC_TONE_CLASS: Record<MetricTone, string> = {
  good: 'text-emerald-600',
  warn: 'text-amber-600',
  bad: 'text-red-600',
  neutral: 'text-foreground',
};

export const CORPS_TONE_DOT: Record<CorpsTone, string> = {
  good: 'bg-emerald-500',
  moderate: 'bg-amber-500',
  low: 'bg-red-500',
  neutral: 'bg-muted-foreground/40',
};

export const CORPS_TONE_TEXT: Record<CorpsTone, string> = {
  good: 'text-emerald-600 dark:text-emerald-400',
  moderate: 'text-amber-600 dark:text-amber-400',
  low: 'text-red-600 dark:text-red-400',
  neutral: 'text-foreground',
};

export function metricToneClass(tone: MetricTone): string {
  return METRIC_TONE_CLASS[tone];
}
