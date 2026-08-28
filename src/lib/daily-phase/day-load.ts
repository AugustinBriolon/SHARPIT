import type { TodayEffortLevel } from '@/lib/today/today-narrative-context';

/**
 * How the day weighed, not what was done in it.
 *
 * The athlete knows which session he did — it is listed below on the same screen.
 * Naming it again spends the one sentence that should be telling him something he
 * does not already know: how much the day cost him.
 *
 * Lives on its own because both the post-session and the end-of-day narratives
 * need it, and the latter is imported by the former.
 */
export function dayLoadLabel(effortLevel: TodayEffortLevel | null, multi: boolean): string {
  if (multi) {
    return 'Journée chargée';
  }
  if (effortLevel === 'high') {
    return 'Journée exigeante';
  }
  if (effortLevel === 'moderate') {
    return 'Journée active';
  }
  return 'Journée engagée';
}
