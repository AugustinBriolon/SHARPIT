'use client';

import { useEffect, useMemo, useState } from 'react';
import { EquipmentItemChecklist } from '@/components/settings/equipment/item-checklist';
import { EquipmentSportTabs } from '@/components/settings/equipment/sport-tabs';
import {
  EquipmentStatusLine,
  strengthInventoryMessage,
} from '@/components/settings/equipment/status-line';
import { StrengthVenuePicker } from '@/components/settings/equipment/strength-venue-picker';
import { useEquipmentPersist } from '@/components/settings/equipment/use-equipment-persist';
import { PracticedSportsPicker } from '@/components/practiced-sports/practiced-sports-picker';
import { usePracticedSportsPersist } from '@/components/practiced-sports/use-practiced-sports-persist';
import {
  catalogItemsForSport,
  EQUIPMENT_SPORT_LABELS,
  type EquipmentItemId,
  type EquipmentSport,
  type StrengthVenue,
} from '@/lib/equipment/catalog';
import { equipmentSportHint } from '@/lib/equipment/format';
import { setStrengthVenue, toggleOwnedItem } from '@/lib/equipment/parse';
import type { AthleteEquipment } from '@/lib/equipment/types';
import { equipmentSportsForPracticed, type AthletePracticedSports } from '@/lib/practiced-sports';

function EquipmentStrengthSection({
  equipment,
  onSelectVenue,
}: {
  equipment: AthleteEquipment;
  onSelectVenue: (venue: StrengthVenue) => void;
}) {
  const venueNote = strengthInventoryMessage(equipment.strengthVenue);
  return (
    <>
      <StrengthVenuePicker value={equipment.strengthVenue} onSelect={onSelectVenue} />
      {venueNote ? <p className="text-muted-foreground text-sm">{venueNote}</p> : null}
    </>
  );
}

function EquipmentInventorySection({
  sport,
  equipment,
  items,
  onToggleItem,
}: {
  sport: EquipmentSport;
  equipment: AthleteEquipment;
  items: ReturnType<typeof catalogItemsForSport>;
  onToggleItem: (itemId: EquipmentItemId, enabled: boolean) => void;
}) {
  const hint = equipmentSportHint(equipment, sport);
  const showHomeGearCaption =
    sport === 'STRENGTH' &&
    (equipment.strengthVenue === 'home' || equipment.strengthVenue === 'both');

  return (
    <>
      {showHomeGearCaption ? (
        <p className="text-muted-foreground text-xs">Matériel maison à fort impact</p>
      ) : null}

      {items.length > 0 ? (
        <EquipmentItemChecklist items={items} owned={equipment.owned} onToggle={onToggleItem} />
      ) : null}

      {hint ? <p className="text-muted-foreground text-xs leading-relaxed">{hint}</p> : null}
    </>
  );
}

export function EquipmentPanel({
  initial,
  initialPracticedSports,
}: {
  initial: AthleteEquipment;
  initialPracticedSports: AthletePracticedSports;
}) {
  const { equipment, message, error, saving, dirty, update } = useEquipmentPersist(initial);
  const {
    sports,
    message: sportsMessage,
    error: sportsError,
    saving: sportsSaving,
    updateSports,
  } = usePracticedSportsPersist(initialPracticedSports);

  const availableSports = useMemo(() => equipmentSportsForPracticed(sports), [sports]);
  const [sport, setSport] = useState<EquipmentSport>(() => availableSports[0] ?? 'RUN');

  useEffect(() => {
    if (availableSports.length === 0) {
      return;
    }
    if (!availableSports.includes(sport)) {
      setSport(availableSports[0]!);
    }
  }, [availableSports, sport]);

  function onToggleItem(itemId: EquipmentItemId, enabled: boolean) {
    update((prev) => toggleOwnedItem(prev, itemId, enabled));
  }

  function onSelectVenue(venue: StrengthVenue) {
    update((prev) => setStrengthVenue(prev, venue === prev.strengthVenue ? null : venue));
  }

  const items = catalogItemsForSport(sport, equipment.strengthVenue);
  const statusMessage = sportsMessage ?? message;
  const statusError = sportsError ?? error;
  const statusSaving = sportsSaving || saving;

  return (
    <div className="space-y-8">
      <section aria-labelledby="practiced-sports-title" className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-section-title" id="practiced-sports-title">
            Sports pratiqués
          </h2>
          <p className="text-muted-foreground text-sm">
            Endurance d&apos;abord — les onglets d&apos;équipement suivent ta sélection.
          </p>
        </div>
        <PracticedSportsPicker
          idPrefix="settings-sports"
          sports={sports}
          onSportsChange={updateSports}
        />
      </section>

      {availableSports.length > 0 ? (
        <section aria-labelledby="equipment-inventory-title" className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-section-title" id="equipment-inventory-title">
              Équipement
            </h2>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Coche uniquement ce qui a un impact réel sur la génération de séances.
            </p>
          </div>

          <EquipmentSportTabs
            availableSports={availableSports}
            sport={sport}
            onSportChange={setSport}
          />

          <div className="space-y-1">
            <p className="text-label">{EQUIPMENT_SPORT_LABELS[sport]}</p>
          </div>

          {sport === 'STRENGTH' ? (
            <EquipmentStrengthSection equipment={equipment} onSelectVenue={onSelectVenue} />
          ) : null}

          <EquipmentInventorySection
            equipment={equipment}
            items={items}
            sport={sport}
            onToggleItem={onToggleItem}
          />
        </section>
      ) : (
        <p className="text-muted-foreground text-sm" role="status">
          Choisis au moins un sport d&apos;endurance pour voir l&apos;équipement associé.
        </p>
      )}

      <EquipmentStatusLine
        dirty={dirty}
        error={statusError}
        message={statusMessage}
        saving={statusSaving}
      />
    </div>
  );
}
