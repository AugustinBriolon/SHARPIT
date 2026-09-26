import type { GoalPayload } from '@/hooks/use-data';
import type { PracticedSportId } from '@sharpit/server/lib/practiced-sports';

export type GoalCreateFormProps = {
  submitLabel?: string;
  skipLabel?: string;
  onSkip?: () => void;
  onCancel?: () => void;
  onSubmit: (payload: GoalPayload) => void | Promise<void>;
  error?: string | null;
  /** When set, metric sport pickers are filtered to these practiced sports. */
  practicedSports?: readonly PracticedSportId[];
  /** Onboarding: hide title, notes, lieu, priorité, fin — those stay on Objectifs. */
  compact?: boolean;
  /**
   * `docked` pins the submit row to the bottom of the screen like every other
   * onboarding step. Defaults to `inline`, so the goal dialog is untouched.
   */
  footerVariant?: 'inline' | 'docked';
};
