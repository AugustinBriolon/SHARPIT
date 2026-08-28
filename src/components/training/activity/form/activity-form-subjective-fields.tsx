'use client';

import type { useActivityForm } from '@/components/training/activity/form/use-activity-form';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ActivityFormSubjectiveFields({
  form,
  resolvedRpe,
  feelingValue,
  feelingOptions,
}: Pick<
  ReturnType<typeof useActivityForm>,
  'form' | 'resolvedRpe' | 'feelingValue' | 'feelingOptions'
>) {
  return (
    <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="rpe">RPE (1-10)</Label>
          <span className="text-muted-foreground font-mono text-sm tabular-nums">
            {resolvedRpe ?? '—'}
          </span>
        </div>
        <input
          className="accent-primary h-2 w-full cursor-pointer"
          id="rpe"
          max={10}
          min={1}
          step={1}
          type="range"
          value={resolvedRpe ?? 5}
          onChange={(e) => form.setValue('rpe', Number(e.target.value))}
        />
        <div className="text-muted-foreground flex justify-between text-[10px]">
          <span>1 · Facile</span>
          <span>10 · Maximal</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-feeling">Ressenti</Label>
        <Select
          value={feelingValue || '__none__'}
          onValueChange={(value) => form.setValue('feeling', value === '__none__' ? '' : value)}
        >
          <SelectTrigger className="w-full" id="activity-feeling">
            <SelectValue placeholder="Non renseigné">
              {feelingValue
                ? (feelingOptions.find((option) => option.value === feelingValue)?.label ??
                  feelingValue)
                : 'Non renseigné'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="w-max max-w-[var(--available-width)] min-w-[var(--anchor-width)]">
            <SelectItem value="__none__">Non renseigné</SelectItem>
            {feelingOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
