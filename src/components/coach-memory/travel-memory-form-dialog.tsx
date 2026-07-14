'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  LocationPlacePicker,
  type LocationPlaceValue,
} from '@/components/planning/location-place-picker';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CoachMemoryEntry } from '@/lib/coach-memory/types';
import type { TravelMemoryPayload } from '@/hooks/use-coach-memory';

type TravelMemoryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: CoachMemoryEntry | null;
  saving?: boolean;
  onSubmit: (payload: TravelMemoryPayload) => void | Promise<void>;
};

function entryToPlace(entry: CoachMemoryEntry | null | undefined): LocationPlaceValue {
  if (!entry?.locationLabel || entry.locationLat == null || entry.locationLng == null) {
    return null;
  }
  return {
    label: entry.locationLabel,
    latitude: entry.locationLat,
    longitude: entry.locationLng,
  };
}

export function TravelMemoryFormDialog({
  open,
  onOpenChange,
  entry,
  saving = false,
  onSubmit,
}: TravelMemoryFormDialogProps) {
  const isEdit = Boolean(entry);
  const titleId = useId();
  const labelRef = useRef<HTMLInputElement>(null);

  const [label, setLabel] = useState('');
  const [place, setPlace] = useState<LocationPlaceValue>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [applyToPlannedSessions, setApplyToPlannedSessions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLabel(entry?.label ?? '');
    setPlace(entryToPlace(entry));
    setStartDate(entry?.startDate ?? '');
    setEndDate(entry?.endDate ?? '');
    setNote(entry?.note ?? '');
    setApplyToPlannedSessions(!isEdit);
    setError(null);
    const timer = window.setTimeout(() => labelRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [entry, isEdit, open]);

  function submitLabel(): string {
    if (saving) return 'Enregistrement…';
    if (isEdit) return 'Enregistrer';
    return 'Ajouter';
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!place) {
      setError('Sélectionne un lieu dans la liste de suggestions.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Les dates de début et de fin sont requises.');
      return;
    }
    if (endDate < startDate) {
      setError('La date de fin doit être postérieure à la date de début.');
      return;
    }

    await onSubmit({
      type: 'TRAVEL',
      label: label.trim() || null,
      locationLabel: place.label,
      locationLat: place.latitude,
      locationLng: place.longitude,
      startDate,
      endDate,
      note: note.trim() || null,
      applyToPlannedSessions: isEdit ? false : applyToPlannedSessions,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-labelledby={titleId} className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle id={titleId}>
              {isEdit ? 'Modifier le déplacement' : 'Ajouter un déplacement'}
            </DialogTitle>
            <DialogDescription>
              Le coach utilisera ce contexte pour adapter la météo et les lieux des séances outdoor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${titleId}-label`}>Titre (optionnel)</Label>
              <Input
                ref={labelRef}
                id={`${titleId}-label`}
                placeholder="Vacances juillet, camp altitude…"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Lieu</Label>
              <LocationPlacePicker value={place} onChange={setPlace} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${titleId}-start`}>Début</Label>
                <Input
                  id={`${titleId}-start`}
                  type="date"
                  value={startDate}
                  required
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${titleId}-end`}>Fin</Label>
                <Input
                  id={`${titleId}-end`}
                  type="date"
                  value={endDate}
                  required
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${titleId}-note`}>Note (optionnel)</Label>
              <Textarea
                id={`${titleId}-note`}
                placeholder="Contraintes, matériel disponible, objectifs du séjour…"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {!isEdit ? (
              <label className="flex items-start gap-2 text-sm">
                <input
                  checked={applyToPlannedSessions}
                  className="mt-1"
                  type="checkbox"
                  onChange={(e) => setApplyToPlannedSessions(e.target.checked)}
                />
                <span>
                  Appliquer aux séances outdoor planifiées sur cette période (météo + lieu).
                </span>
              </label>
            ) : null}

            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button
              disabled={saving}
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button disabled={saving} type="submit">
              {submitLabel()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
