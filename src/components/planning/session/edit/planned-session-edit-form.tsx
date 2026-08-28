'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { activityTypeLabels } from '@/lib/format';
import { ActivityType } from '@prisma/client';
import { format } from 'date-fns';
import type { usePlannedSessionDialog } from '@/components/planning/session/edit/use-planned-session-dialog';
import { PlannedSessionSingleFields } from '@/components/planning/session/edit/planned-session-single-fields';
import { PlannedSessionBrickFields } from '@/components/planning/session/edit/planned-session-brick-fields';
import { PlannedSessionFormFooter } from '@/components/planning/session/edit/planned-session-form-footer';

export function PlannedSessionEditForm({
  dialog,
}: {
  dialog: ReturnType<typeof usePlannedSessionDialog>;
}) {
  const {
    formKey,
    handleSubmit,
    createMode,
    isEdit,
    session,
    type,
    initialDate,
    selectActivityType,
  } = dialog;

  return (
    <form key={formKey} className="min-w-0 space-y-4" onSubmit={handleSubmit}>
      {createMode === 'single' ? (
        <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label>Sport</Label>
            <Select
              disabled={isEdit}
              value={type}
              onValueChange={(v) => selectActivityType(v as ActivityType)}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue>{activityTypeLabels[type]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.values(ActivityType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {activityTypeLabels[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              defaultValue={session?.title ?? ''}
              id="title"
              name="title"
              placeholder="Sortie longue Z2"
            />
          </div>
        </div>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            className="min-w-0"
            defaultValue={format(initialDate, 'yyyy-MM-dd')}
            id="date"
            name="date"
            type="date"
            required
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="startTime">Heure (optionnel)</Label>
          <Input
            className="min-w-0"
            defaultValue={session?.startTime ?? ''}
            id="startTime"
            name="startTime"
            type="time"
          />
        </div>
      </div>
      <p className="text-muted-foreground -mt-1 text-xs">
        Laisse l&apos;heure vide pour que le créneau soit choisi automatiquement dans ton agenda
        Google.
      </p>

      {createMode === 'single' ? (
        <PlannedSessionSingleFields dialog={dialog} />
      ) : (
        <PlannedSessionBrickFields dialog={dialog} />
      )}
      <PlannedSessionFormFooter dialog={dialog} />
    </form>
  );
}
