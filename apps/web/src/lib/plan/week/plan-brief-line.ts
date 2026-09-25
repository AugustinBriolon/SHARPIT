import type { WeeklyCoachingBriefViewModel } from '@/core/presentation/weekly-coaching-brief-view-model';

/**
 * One sentence for the hub. The full brief lives on `/plan/bilan`.
 *
 * Prefer the coach's latest learning line: it already decided what matters
 * this week. Phase is a fallback when the brief is visible but still empty.
 */
export function briefHubLine(vm: WeeklyCoachingBriefViewModel | null | undefined): string | null {
  if (!vm?.visible) {
    return null;
  }
  const learning = vm.learningFeedback[0]?.sentence?.trim();
  return learning || null;
}
