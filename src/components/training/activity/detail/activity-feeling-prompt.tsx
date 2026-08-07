'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { useActivityMutations } from '@/hooks/use-data';

const FEELING_OPTIONS = [
  { value: 'Très bien', label: 'Très bien' },
  { value: 'Bien', label: 'Bien' },
  { value: 'Correct', label: 'Correct' },
  { value: 'Mal', label: 'Mal' },
  { value: 'Très mal', label: 'Très mal' },
] as const;

/**
 * Optional, discreet entry to add session RPE / feeling — never a mandatory banner.
 */
export function ActivityFeelingPrompt({ activityId }: { activityId: string }) {
  const router = useRouter();
  const { update } = useActivityMutations();
  const feelingErrorId = useId();
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

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ressenti de la séance</DialogTitle>
            <DialogDescription>
              Optionnel — utile pour la charge perçue et la récupération.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor={`feeling-rpe-${activityId}`}>RPE (1–10) · {rpe}</Label>
              <input
                className="accent-primary w-full"
                id={`feeling-rpe-${activityId}`}
                max={10}
                min={1}
                type="range"
                value={rpe}
                onChange={(e) => setRpe(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`feeling-select-${activityId}`}>Ressenti</Label>
              <Select
                value={feeling || '__none__'}
                onValueChange={(v) => {
                  setFeeling(v == null || v === '__none__' ? '' : v);
                  setFeelingError(null);
                }}
              >
                <SelectTrigger
                  aria-describedby={feelingError ? feelingErrorId : undefined}
                  aria-invalid={feelingError ? true : undefined}
                  className="w-full"
                  id={`feeling-select-${activityId}`}
                >
                  <SelectValue placeholder="Choisir…">
                    {feeling
                      ? (FEELING_OPTIONS.find((option) => option.value === feeling)?.label ??
                        feeling)
                      : 'Choisir…'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Choisir…</SelectItem>
                  {FEELING_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {feelingError ? (
                <p aria-live="assertive" className="text-destructive text-xs" id={feelingErrorId}>
                  {feelingError}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={update.isPending || !feeling}
              type="button"
              variant="highlight"
              onClick={() => void handleSave()}
            >
              {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
