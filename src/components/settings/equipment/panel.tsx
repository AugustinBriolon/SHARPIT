'use client';

import { PracticedSportsPicker } from '@/components/practiced-sports/practiced-sports-picker';
import { usePracticedSportsPersist } from '@/components/practiced-sports/use-practiced-sports-persist';
import { EquipmentInventory } from '@/components/settings/equipment/inventory';
import { EquipmentStatusLine } from '@/components/settings/equipment/status-line';
import type { AthleteEquipment } from '@/lib/equipment/types';
import type { AthletePracticedSports } from '@/lib/practiced-sports';

export function EquipmentPanel({
  initial,
  initialPracticedSports,
}: {
  initial: AthleteEquipment;
  initialPracticedSports: AthletePracticedSports;
}) {
  const {
    sports,
    message: sportsMessage,
    error: sportsError,
    saving: sportsSaving,
    updateSports,
  } = usePracticedSportsPersist(initialPracticedSports);

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
          compact
          onSportsChange={updateSports}
        />
        <EquipmentStatusLine
          dirty={false}
          error={sportsError}
          message={sportsMessage}
          saving={sportsSaving}
        />
      </section>

      <EquipmentInventory initial={initial} practicedSports={sports} />
    </div>
  );
}
