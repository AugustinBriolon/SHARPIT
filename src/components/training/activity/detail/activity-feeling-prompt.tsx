'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from '@/components/ui/toast';
import { useActivityMutations } from '@/hooks/use-data';
import { ActivityFeelingDialog } from '@/components/training/activity/detail/activity-feeling-dialog';

/**
 * Optional, discreet entry to add session RPE / feeling — never a mandatory banner.
 */
export function ActivityFeelingPrompt({ activityId }: { activityId: string }) {
  const router = useRouter();
  const { update } = useActivityMutations();
  const [open, setOpen] = useState(false);
  const [rpe, setRpe] = useState(5);
  const [feeling, setFeeling] = useState('');
  const [feelingError, setFeelingError] = useState<string | null>(null);

  async function handleSave() {
    if (!feeling) {
      setFeelingError('Choisis un ressenti.');
      return;
    }
    setFeelingError(null);
    try {
      await update.mutateAsync({
        id: activityId,
        data: { rpe, feeling },
      });
      toast.success('Ressenti enregistré');
      setOpen(false);
      setFeeling('');
      setRpe(5);
      router.refresh();
    } catch {
      // toast from mutation
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setFeelingError(null);
    }
  }

  function handleFeelingChange(next: string) {
    setFeeling(next);
    setFeelingError(null);
  }

  return (
    <>
      <button
        className="text-muted-foreground hover:text-foreground text-data pressable inline-flex min-h-11 items-center gap-1 px-1 text-xs tracking-wide lg:min-h-9"
        type="button"
        onClick={() => setOpen(true)}
      >
        Ajouter ressenti
        <span className="opacity-50" aria-hidden>
          ·
        </span>
        <span className="text-xs tracking-wider opacity-70">RPE</span>
      </button>

      <ActivityFeelingDialog
        activityId={activityId}
        feeling={feeling}
        feelingError={feelingError}
        isPending={update.isPending}
        open={open}
        rpe={rpe}
        onFeelingChange={handleFeelingChange}
        onOpenChange={handleOpenChange}
        onRpeChange={setRpe}
        onSave={() => void handleSave()}
      />
    </>
  );
}
