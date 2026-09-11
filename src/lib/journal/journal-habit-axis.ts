/**
 * Shared horizontal axes for journal habit dumbbells — one per outcome domain.
 * Bounds are readable defaults, not data min/max: every row of a domain uses
 * the same axis so gaps compare by length. Ticks and points go through the
 * same `axisPosition`, which is what keeps them aligned.
 */

import type { JournalOutcomeKey } from '@/lib/journal/journal-habit-analysis';
import { formatOutcomeValue } from '@/lib/journal/journal-habit-finding-copy';

export type JournalHabitAxis = {
  outcome: JournalOutcomeKey;
  min: number;
  max: number;
  ticks: readonly number[];
};

export type AxisPosition = {
  /** 0–100, clamped to the axis. */
  pct: number;
  /** Set when the value lies outside the axis and was clamped. */
  overflow: 'low' | 'high' | null;
};

export type AxisTick = { value: number; label: string; pct: number };

export const JOURNAL_HABIT_AXES: Record<JournalOutcomeKey, JournalHabitAxis> = {
  sleepMinutes: { outcome: 'sleepMinutes', min: 330, max: 510, ticks: [330, 390, 450, 510] },
  recoveryScore: { outcome: 'recoveryScore', min: 30, max: 90, ticks: [30, 50, 70, 90] },
  bodyBattery: { outcome: 'bodyBattery', min: 20, max: 80, ticks: [20, 40, 60, 80] },
};

export function axisPosition(axis: JournalHabitAxis, value: number): AxisPosition {
  if (value < axis.min) {
    return { pct: 0, overflow: 'low' };
  }
  if (value > axis.max) {
    return { pct: 100, overflow: 'high' };
  }
  return { pct: ((value - axis.min) / (axis.max - axis.min)) * 100, overflow: null };
}

export function axisTicks(axis: JournalHabitAxis): AxisTick[] {
  return axis.ticks.map((value) => ({
    value,
    label: formatOutcomeValue(axis.outcome, value),
    pct: axisPosition(axis, value).pct,
  }));
}
