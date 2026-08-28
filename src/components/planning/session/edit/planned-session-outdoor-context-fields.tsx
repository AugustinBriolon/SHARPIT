'use client';

import { LocationPlacePicker } from '@/components/ui/location-place-picker';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { exposureLabels } from '@/lib/planned-session/sessions';
import { cn } from '@/lib/utils';
import type { usePlannedSessionDialog } from '@/components/planning/session/edit/use-planned-session-dialog';

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
