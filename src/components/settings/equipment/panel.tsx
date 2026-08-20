'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
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

export function EquipmentPanel({ initial }: { initial: AthleteEquipment }) {
  const { equipment, message, error, saving, dirty, update } = useEquipmentPersist(initial);
  const [sport, setSport] = useState<EquipmentSport>('BIKE');

  function onToggleItem(itemId: EquipmentItemId, enabled: boolean) {
    update((prev) => toggleOwnedItem(prev, itemId, enabled));
  }

  function onSelectVenue(venue: StrengthVenue) {
    update((prev) => setStrengthVenue(prev, venue === prev.strengthVenue ? null : venue));
  }

  const items = catalogItemsForSport(sport, equipment.strengthVenue);
  const hint = equipmentSportHint(equipment, sport);
  const showHomeGearCaption =
    sport === 'STRENGTH' &&
    (equipment.strengthVenue === 'home' || equipment.strengthVenue === 'both');

  const venueNote = sport === 'STRENGTH' ? strengthInventoryMessage(equipment.strengthVenue) : null;

  const inventoryBody: ReactNode =
    items.length > 0 ? (
      <EquipmentItemChecklist items={items} owned={equipment.owned} onToggle={onToggleItem} />
    ) : null;

  return (
    <div className="space-y-4">
      <EquipmentSportTabs sport={sport} onSportChange={setSport} />

      <div className="space-y-1">
        <p className="text-label">{EQUIPMENT_SPORT_LABELS[sport]}</p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Coche uniquement ce qui a un impact réel sur la génération de séances.
        </p>
      </div>

      {sport === 'STRENGTH' ? (
        <StrengthVenuePicker value={equipment.strengthVenue} onSelect={onSelectVenue} />
      ) : null}

      {venueNote ? <p className="text-muted-foreground text-sm">{venueNote}</p> : null}

      {showHomeGearCaption ? (
        <p className="text-muted-foreground text-xs">Matériel maison à fort impact</p>
      ) : null}

      {inventoryBody}

      {hint ? <p className="text-muted-foreground text-xs leading-relaxed">{hint}</p> : null}

      <EquipmentStatusLine dirty={dirty} error={error} message={message} saving={saving} />
    </div>
  );
}
