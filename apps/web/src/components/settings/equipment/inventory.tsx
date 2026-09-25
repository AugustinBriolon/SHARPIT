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
import { equipmentSportsForPracticed, type PracticedSportId } from '@/lib/practiced-sports';

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

/**
 * Filtered equipment checklist/tabs for practiced sports.
 * Shared by Settings (below sports editor) and onboarding Equipment step.
 */
export function EquipmentInventory({
  initial,
  practicedSports,
  showSectionTitle = true,
}: {
  initial: AthleteEquipment;
  practicedSports: readonly PracticedSportId[];
  showSectionTitle?: boolean;
}) {
  const persist = useEquipmentPersist(initial);
  return (
    <EquipmentInventoryView
      availableSports={equipmentSportsForPracticed(practicedSports)}
      dirty={persist.dirty}
      equipment={persist.equipment}
      error={persist.error}
      message={persist.message}
      saving={persist.saving}
      showSectionTitle={showSectionTitle}
      update={persist.update}
    />
  );
}

export type EquipmentPersistApi = ReturnType<typeof useEquipmentPersist>;

/** Presentational inventory driven by an external persist hook (onboarding continue/flush). */
export function EquipmentInventoryView({
  availableSports,
  equipment,
  update,
  message,
  error,
  saving,
  dirty,
  showSectionTitle = true,
}: {
  availableSports: readonly EquipmentSport[];
  equipment: AthleteEquipment;
  update: EquipmentPersistApi['update'];
  message: string | null;
  error: string | null;
  saving: boolean;
  dirty: boolean;
  showSectionTitle?: boolean;
}) {
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

  const items = useMemo(
    () => catalogItemsForSport(sport, equipment.strengthVenue),
    [sport, equipment.strengthVenue],
  );

  if (availableSports.length === 0) {
    return (
      <p className="text-muted-foreground text-sm" role="status">
        Aucun sport sélectionné — rien à inventaire pour l&apos;instant.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {showSectionTitle ? (
        <div className="space-y-1">
          <h2 className="text-section-title" id="equipment-inventory-title">
            Équipement
          </h2>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Coche uniquement ce qui a un impact réel sur la génération de séances.
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs leading-relaxed">
          Coche uniquement ce qui a un impact réel sur la génération de séances.
        </p>
      )}

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

      <EquipmentStatusLine dirty={dirty} error={error} message={message} saving={saving} />
    </div>
  );
}
