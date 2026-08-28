import { toast } from '@/components/ui/toast';
import { formatClockDuration } from '@/lib/format';
import type { ActivityDetail } from '@/components/training/activity/detail/types';

export function formatStrengthSetDetail(set: ActivityDetail['strengthSets'][number]): string {
  if (set.durationSec && set.durationSec > 0 && !set.weightKg) {
    const perSet = formatClockDuration(set.durationSec);
    return set.sets > 1 ? `${set.sets} × ${perSet}` : perSet;
  }

  const base = `${set.sets}×${set.reps}`;
  return set.weightKg ? `${base} @ ${set.weightKg} kg` : base;
}

export async function sendActivityStrengthToGarmin(activityId: string): Promise<void> {
  const response = await fetch('/api/garmin/workouts/from-activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activityId, schedule: true }),
  });
  const data = (await response.json()) as {
    error?: string;
    workoutName?: string;
    mappedCount?: number;
    skipped?: Array<{ exercise: string }>;
    scheduledDate?: string | null;
  };
  if (!response.ok) {
    throw new Error(data.error || 'Envoi impossible');
  }
  const skipped = data.skipped?.length ?? 0;
  toast.success('Workout envoyé à Garmin', {
    description: [
      data.workoutName,
      data.scheduledDate ? `calendrier ${data.scheduledDate}` : null,
      skipped > 0 ? `${skipped} omis (hors catalogue)` : null,
    ]
      .filter(Boolean)
      .join(' · '),
  });
}
