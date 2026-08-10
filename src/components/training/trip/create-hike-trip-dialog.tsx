'use client';

import { Mountain } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useHikeTripMutations } from '@/hooks/use-data';

type CreateHikeTripDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityIds: string[];
  onCreated?: () => void;
};

export function CreateHikeTripDialog({
  open,
  onOpenChange,
  activityIds,
  onCreated,
}: CreateHikeTripDialogProps) {
  const router = useRouter();
  const { create } = useHikeTripMutations();
  const [name, setName] = useState('');

  useEffect(() => {
    if (!open) setName('');
  }, [open]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    create.mutate(
      { name: trimmed, activityIds },
      {
        onSuccess: (trip) => {
          onOpenChange(false);
          onCreated?.();
          router.push(`/training/trips/${trip.id}`);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mountain className="text-primary size-5 shrink-0" aria-hidden />
              Créer un séjour
            </DialogTitle>
            <DialogDescription>
              {activityIds.length} randonnée{activityIds.length > 1 ? 's' : ''} seront liées à ce
              dossier.
            </DialogDescription>
          </DialogHeader>
          <Input
            className="mt-4"
            placeholder="Ex. Queyras · août"
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button disabled={!name.trim() || create.isPending} type="submit">
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
