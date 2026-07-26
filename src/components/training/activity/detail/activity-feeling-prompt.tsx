'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
  const [open, setOpen] = useState(false);
  const [rpe, setRpe] = useState(5);
  const [feeling, setFeeling] = useState('');

  async function handleSave() {
    if (!feeling) {
      toast.error('Choisis un ressenti');
      return;
    }
    try {
      await update.mutateAsync({
        id: activityId,
        data: { rpe, feeling },
      });
      toast.success('Ressenti enregistré');
      setOpen(false);
      router.refresh();
    } catch {
      // toast from mutation
    }
  }

  return (
    <>
      <button
        className="text-muted-foreground hover:text-foreground text-data inline-flex items-center gap-1 text-[11px] tracking-wide transition-colors"
        type="button"
        onClick={() => setOpen(true)}
      >
        Ajouter ressenti
        <span className="opacity-50" aria-hidden>
          ·
        </span>
        <span className="text-[10px] tracking-wider opacity-70">RPE</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
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
              <Label>Ressenti</Label>
              <Select
                value={feeling || '__none__'}
                onValueChange={(v) => setFeeling(v == null || v === '__none__' ? '' : v)}
              >
                <SelectTrigger className="w-full">
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
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={update.isPending}
              type="button"
              variant="highlight"
              onClick={() => void handleSave()}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
