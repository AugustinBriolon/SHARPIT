'use client';

import { SessionAccessoriesPicker } from '@/components/planning/session/accessories/session-accessories-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { usePlannedSessionDialog } from '@/components/planning/session/edit/use-planned-session-dialog';
import { PlannedSessionPrescriptionFields } from '@/components/planning/session/edit/planned-session-prescription-fields';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { intensityLabels, intensityOrder, exposureLabels } from '@/lib/planned-session/sessions';
import type { SessionIntensity } from '@prisma/client';
import { NO_GOAL } from '@/components/planning/session/edit/planned-session-dialog-helpers';
import { LocationPlacePicker } from '@/components/ui/location-place-picker';
import { cn } from '@/lib/utils';

export function PlannedSessionSingleFields({
  dialog,
}: {
  dialog: ReturnType<typeof usePlannedSessionDialog>;
}) {
  const { showOutdoorContext, session, type, accessories, setAccessories } = dialog;

  return (
    <>
      <PlannedSessionIntensityGoalFields dialog={dialog} />

      {showOutdoorContext ? <PlannedSessionOutdoorContextFields dialog={dialog} /> : null}

      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="durationMin">Durée (min)</Label>
          <Input
            defaultValue={session?.durationMin ?? ''}
            id="durationMin"
            min={0}
            name="durationMin"
            placeholder="90"
            type="number"
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="load">Charge prévue (TSS)</Label>
          <Input
            defaultValue={session?.load ?? ''}
            id="load"
            min={0}
            name="load"
            placeholder="auto si vide"
            step="any"
            type="number"
          />
        </div>
      </div>

      <PlannedSessionPrescriptionFields dialog={dialog} />

      <SessionAccessoriesPicker selected={accessories} type={type} onChange={setAccessories} />
    </>
  );
}

export function PlannedSessionIntensityGoalFields({
  dialog,
}: {
  dialog: ReturnType<typeof usePlannedSessionDialog>;
}) {
  const { intensity, setIntensity, goalId, setGoalId, linkableGoals } = dialog;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
      <div className="min-w-0 space-y-2">
        <Label>Intensité</Label>
        <Select value={intensity} onValueChange={(v) => setIntensity(v as SessionIntensity)}>
          <SelectTrigger className="w-full min-w-0">
            <SelectValue>{intensityLabels[intensity]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {intensityOrder.map((i) => (
              <SelectItem key={i} value={i}>
                {intensityLabels[i]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 space-y-2">
        <Label>Objectif lié</Label>
        <Select value={goalId} onValueChange={(v) => setGoalId(v ?? NO_GOAL)}>
          <SelectTrigger className="w-full min-w-0">
            <SelectValue>
              {goalId === NO_GOAL
                ? 'Aucun'
                : (linkableGoals.find((g) => g.id === goalId)?.title ?? 'Aucun')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_GOAL}>Aucun</SelectItem>
            {linkableGoals.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function PlannedSessionOutdoorContextFields({
  dialog,
}: {
  dialog: ReturnType<typeof usePlannedSessionDialog>;
}) {
  const {
    exposure,
    setExposure,
    locationSource,
    setLocationSource,
    customPlace,
    setCustomPlace,
    homeQuery,
    travelQuery,
  } = dialog;
  return (
    <div className="border-border/60 bg-muted/20 space-y-3 rounded-lg border p-3">
      <p className="text-foreground text-sm font-medium">Conditions de la séance</p>
      <div className="min-w-0 space-y-2">
        <Label>Lieu d&apos;entraînement</Label>
        <Select
          value={exposure}
          onValueChange={(v) => setExposure(v as 'INDOOR' | 'OUTDOOR' | 'UNKNOWN')}
        >
          <SelectTrigger className="w-full min-w-0">
            <SelectValue>{exposureLabels[exposure]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OUTDOOR">Extérieur</SelectItem>
            <SelectItem value="INDOOR">Intérieur / home trainer</SelectItem>
            <SelectItem value="UNKNOWN">À confirmer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {exposure === 'OUTDOOR' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['home', 'Domicile (Colombes)'],
                ['travel', 'Voyage actif'],
                ['custom', 'Autre lieu'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                disabled={id === 'travel' && !travelQuery.data?.active}
                type="button"
                className={cn(
                  'pressable rounded-full border px-3 py-1 text-xs font-medium',
                  locationSource === id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground',
                  id === 'travel' && !travelQuery.data?.active && 'opacity-40',
                )}
                onClick={() => setLocationSource(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {locationSource === 'custom' ? (
            <LocationPlacePicker value={customPlace} onChange={setCustomPlace} />
          ) : (
            <p className="text-muted-foreground text-xs">
              {locationSource === 'home'
                ? (homeQuery.data?.home.label ?? 'Colombes, France')
                : travelQuery.data?.active?.locationLabel}
            </p>
          )}
        </div>
      ) : null}

      <p className="text-muted-foreground text-xs leading-relaxed">
        SHARPIT utilise le lieu pour anticiper chaleur, pluie et vent avant la séance — sans
        afficher la météo brute en premier.
      </p>
    </div>
  );
}
