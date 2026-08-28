'use client';

import { useId } from 'react';
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

const FEELING_OPTIONS = [
  { value: 'Très bien', label: 'Très bien' },
  { value: 'Bien', label: 'Bien' },
  { value: 'Correct', label: 'Correct' },
  { value: 'Mal', label: 'Mal' },
  { value: 'Très mal', label: 'Très mal' },
] as const;

function FeelingSelectField({
  activityId,
  feeling,
  feelingError,
  feelingErrorId,
  onFeelingChange,
}: {
  activityId: string;
  feeling: string;
  feelingError: string | null;
  feelingErrorId: string;
  onFeelingChange: (feeling: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`feeling-select-${activityId}`}>Ressenti</Label>
      <Select
        value={feeling || '__none__'}
        onValueChange={(v) => onFeelingChange(v === null || v === '__none__' ? '' : v)}
      >
        <SelectTrigger
          aria-describedby={feelingError ? feelingErrorId : undefined}
          aria-invalid={feelingError ? true : undefined}
          className="w-full"
          id={`feeling-select-${activityId}`}
        >
          <SelectValue placeholder="Choisir…">
            {feeling
              ? (FEELING_OPTIONS.find((option) => option.value === feeling)?.label ?? feeling)
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
  );
}

export function ActivityFeelingDialog({
  activityId,
  open,
  rpe,
  feeling,
  feelingError,
  isPending,
  onOpenChange,
  onRpeChange,
  onFeelingChange,
  onSave,
}: {
  activityId: string;
  open: boolean;
  rpe: number;
  feeling: string;
  feelingError: string | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onRpeChange: (rpe: number) => void;
  onFeelingChange: (feeling: string) => void;
  onSave: () => void;
}) {
  const feelingErrorId = useId();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onChange={(e) => onRpeChange(Number(e.target.value))}
            />
          </div>
          <FeelingSelectField
            activityId={activityId}
            feeling={feeling}
            feelingError={feelingError}
            feelingErrorId={feelingErrorId}
            onFeelingChange={onFeelingChange}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={isPending || !feeling}
            type="button"
            variant="highlight"
            onClick={onSave}
          >
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
