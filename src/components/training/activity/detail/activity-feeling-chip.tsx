'use client';

import { useState } from 'react';
import { Smile } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ActivityMetaChip } from '@/components/training/activity/detail/activity-meta-chip';
import { ActivityFeelingDialog } from '@/components/training/activity/detail/activity-feeling-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useActivityMutations } from '@/hooks/use-data';
import { toast } from '@/components/ui/toast';

function feelingSummaryCopy(feeling: string, rpe: number | null): string {
  const parts = [`Ressenti déclaré : ${feeling}.`];
  if (rpe !== null) {
    parts.push(`RPE ${rpe}/10.`);
  }
  parts.push(
    'Ces signaux nourrissent la charge perçue (Foster) et la lecture de récupération — plus tu les renseignes, plus le jumeau reste aligné avec ton vécu.',
  );
  return parts.join(' ');
}

export function ActivityFeelingChip({
  activityId,
  feeling,
  rpe,
}: {
  activityId: string;
  feeling: string;
  rpe: number | null;
}) {
  const router = useRouter();
  const { update } = useActivityMutations();
  const [infoOpen, setInfoOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRpe, setEditRpe] = useState(rpe ?? 5);
  const [editFeeling, setEditFeeling] = useState(feeling);
  const [feelingError, setFeelingError] = useState<string | null>(null);

  const chipValue = rpe !== null ? `${feeling} · RPE ${rpe}` : feeling;

  function openInfo() {
    setEditRpe(rpe ?? 5);
    setEditFeeling(feeling);
    setFeelingError(null);
    setInfoOpen(true);
  }

  function openEdit() {
    setInfoOpen(false);
    setEditRpe(rpe ?? 5);
    setEditFeeling(feeling);
    setFeelingError(null);
    setEditOpen(true);
  }

  function handleSave() {
    if (!editFeeling) {
      setFeelingError('Choisis un ressenti.');
      return;
    }
    setFeelingError(null);
    setEditOpen(false);
    update.mutate(
      { id: activityId, data: { rpe: editRpe, feeling: editFeeling } },
      {
        onSuccess: () => {
          toast.success('Ressenti enregistré');
          router.refresh();
        },
      },
    );
  }

  return (
    <>
      <ActivityMetaChip icon={Smile} label="Ressenti" value={chipValue} onClick={openInfo} />

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ressenti de la séance</DialogTitle>
            <DialogDescription>{feelingSummaryCopy(feeling, rpe)}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setInfoOpen(false)}>
              Fermer
            </Button>
            <Button type="button" variant="outline" onClick={openEdit}>
              Modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ActivityFeelingDialog
        activityId={activityId}
        feeling={editFeeling}
        feelingError={feelingError}
        isPending={update.isPending}
        open={editOpen}
        rpe={editRpe}
        onOpenChange={setEditOpen}
        onRpeChange={setEditRpe}
        onSave={() => void handleSave()}
        onFeelingChange={(next) => {
          setEditFeeling(next);
          setFeelingError(null);
        }}
      />
    </>
  );
}
