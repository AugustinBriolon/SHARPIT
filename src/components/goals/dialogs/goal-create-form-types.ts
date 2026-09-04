import type { GoalPayload } from '@/hooks/use-data';
import type { PracticedSportId } from '@/lib/practiced-sports';

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
};
