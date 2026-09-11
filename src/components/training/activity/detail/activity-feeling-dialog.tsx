'use client';

import { useId } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  ACTIVITY_FEELING_SCALE,
  type ActivityFeelingOption,
} from '@/lib/activity/feeling/activity-feeling-scale';
import { cn } from '@/lib/utils';

function moveFeelingSelection(value: string, delta: number): string {
  const index = ACTIVITY_FEELING_SCALE.findIndex((option) => option.value === value);
  const fallback = index < 0 ? 0 : index;
  const next =
    ACTIVITY_FEELING_SCALE[
      (fallback + delta + ACTIVITY_FEELING_SCALE.length) % ACTIVITY_FEELING_SCALE.length
    ]!;
  return next.value;
}

function FeelingScaleOption({
  option,
  selected,
  onSelect,
}: {
  option: ActivityFeelingOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      aria-checked={selected}
      aria-label={`${option.label} — ${option.hint}`}
      role="radio"
      tabIndex={selected ? 0 : -1}
      type="button"
      className={cn(
        'pressable-lg flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2',
        selected
          ? 'border-highlight bg-highlight text-highlight-foreground'
          : 'border-border/70 bg-background hover:border-primary/30 hover:bg-muted/40',
      )}
      onClick={onSelect}
    >
      <span className="text-xl leading-none" aria-hidden>
        {option.icon}
      </span>
      <span
        className={cn(
          'text-[0.65rem] leading-tight font-medium',
          selected ? 'text-highlight-foreground/80' : 'text-muted-foreground',
        )}
        aria-hidden
      >
        {option.label}
      </span>
    </button>
  );
}

function createFeelingScaleKeyDownHandler(value: string, onChange: (feeling: string) => void) {
  return (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      onChange(moveFeelingSelection(value, 1));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      onChange(moveFeelingSelection(value, -1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      onChange(ACTIVITY_FEELING_SCALE[0]!.value);
    } else if (event.key === 'End') {
      event.preventDefault();
      onChange(ACTIVITY_FEELING_SCALE.at(-1)!.value);
    }
  };
}

function FeelingScaleLabels({
  labelId,
  hintId,
  hint,
}: {
  labelId: string;
  hintId: string;
  hint: string;
}) {
  return (
    <div>
      <p className="text-foreground text-sm font-medium" id={labelId}>
        Ressenti global
      </p>
      <p className="text-muted-foreground text-xs" id={hintId}>
        {hint}
      </p>
    </div>
  );
}

function FeelingScalePicker({
  value,
  onChange,
  feelingError,
  feelingErrorId,
}: {
  value: string;
  onChange: (feeling: string) => void;
  feelingError: string | null;
  feelingErrorId: string;
}) {
  const labelId = useId();
  const hintId = useId();
  const selected = ACTIVITY_FEELING_SCALE.find((option) => option.value === value);
  const hint = selected?.hint ?? 'Comment as-tu vécu cette séance dans l’ensemble ?';

  return (
    <div
      aria-describedby={hintId}
      aria-labelledby={labelId}
      className="space-y-2.5"
      role="radiogroup"
      onKeyDown={createFeelingScaleKeyDownHandler(value, onChange)}
    >
      <FeelingScaleLabels hint={hint} hintId={hintId} labelId={labelId} />
      <div className="grid grid-cols-5 gap-1.5">
        {ACTIVITY_FEELING_SCALE.map((option) => (
          <FeelingScaleOption
            key={option.value}
            option={option}
            selected={value === option.value}
            onSelect={() => onChange(option.value)}
          />
        ))}
      </div>
      {feelingError ? (
        <p aria-live="assertive" className="text-destructive text-xs" id={feelingErrorId}>
          {feelingError}
        </p>
      ) : null}
    </div>
  );
}

function FeelingDialogFooter({
  feeling,
  onClose,
  onSave,
}: {
  feeling: string;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="border-border/60 bg-muted/40 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t px-5 py-3">
      <Button className="h-8 w-fit px-3 text-xs" type="button" variant="ghost" onClick={onClose}>
        Fermer
      </Button>
      <Button
        className="h-8 w-fit px-3 text-xs"
        disabled={!feeling}
        type="button"
        variant="highlight"
        onClick={onSave}
      >
        Enregistrer
      </Button>
    </div>
  );
}

function FeelingRpeField({
  activityId,
  rpe,
  onRpeChange,
}: {
  activityId: string;
  rpe: number;
  onRpeChange: (rpe: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`feeling-rpe-${activityId}`}>Effort perçu (RPE) · {rpe}/10</Label>
      <input
        className="accent-primary w-full"
        id={`feeling-rpe-${activityId}`}
        max={10}
        min={1}
        type="range"
        value={rpe}
        onChange={(e) => onRpeChange(Number(e.target.value))}
      />
      <p className="text-muted-foreground text-xs">
        1 = très facile · 10 = effort maximal sur la séance.
      </p>
    </div>
  );
}

type ActivityFeelingDialogProps = {
  activityId: string;
  open: boolean;
  rpe: number;
  feeling: string;
  feelingError: string | null;
  onOpenChange: (open: boolean) => void;
  onRpeChange: (rpe: number) => void;
  onFeelingChange: (feeling: string) => void;
  onSave: () => void;
};

function ActivityFeelingDialogBody({
  activityId,
  rpe,
  feeling,
  feelingError,
  feelingErrorId,
  onRpeChange,
  onFeelingChange,
}: Pick<
  ActivityFeelingDialogProps,
  'activityId' | 'rpe' | 'feeling' | 'feelingError' | 'onRpeChange' | 'onFeelingChange'
> & { feelingErrorId: string }) {
  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-4">
      <FeelingScalePicker
        feelingError={feelingError}
        feelingErrorId={feelingErrorId}
        value={feeling}
        onChange={onFeelingChange}
      />
      <FeelingRpeField activityId={activityId} rpe={rpe} onRpeChange={onRpeChange} />
    </div>
  );
}

export function ActivityFeelingDialog({
  activityId,
  open,
  rpe,
  feeling,
  feelingError,
  onOpenChange,
  onRpeChange,
  onFeelingChange,
  onSave,
}: ActivityFeelingDialogProps) {
  const feelingErrorId = useId();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,40rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 space-y-1 border-b px-5 py-4 pr-12 text-left">
          <DialogTitle className="font-heading text-lg">Ressenti de la séance</DialogTitle>
          <DialogDescription>
            Ton vécu nourrit la charge perçue (Foster) et la lecture de récupération.
          </DialogDescription>
        </DialogHeader>
        <ActivityFeelingDialogBody
          activityId={activityId}
          feeling={feeling}
          feelingError={feelingError}
          feelingErrorId={feelingErrorId}
          rpe={rpe}
          onFeelingChange={onFeelingChange}
          onRpeChange={onRpeChange}
        />
        <FeelingDialogFooter
          feeling={feeling}
          onClose={() => onOpenChange(false)}
          onSave={onSave}
        />
      </DialogContent>
    </Dialog>
  );
}
