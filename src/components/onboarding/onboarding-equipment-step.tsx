'use client';

import { useMemo } from 'react';
import { EquipmentInventoryView } from '@/components/settings/equipment/inventory';
import { useEquipmentPersist } from '@/components/settings/equipment/use-equipment-persist';
import { Button } from '@/components/ui/button';
import { EMPTY_ATHLETE_EQUIPMENT, type AthleteEquipment } from '@/lib/equipment/types';
import { equipmentSportsForPracticed, type PracticedSportId } from '@/lib/practiced-sports';

export function OnboardingEquipmentStep({
  practicedSports,
  initialEquipment,
  busy,
  error,
  onBack,
  onContinue,
  onSkip,
}: {
  practicedSports: readonly PracticedSportId[];
  initialEquipment?: AthleteEquipment | null;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onContinue: () => void | Promise<void>;
  onSkip: () => void | Promise<void>;
}) {
  const persist = useEquipmentPersist(initialEquipment ?? EMPTY_ATHLETE_EQUIPMENT);
  const availableSports = useMemo(
    () => equipmentSportsForPracticed(practicedSports),
    [practicedSports],
  );

  async function handleContinue() {
    await persist.flush();
    await onContinue();
  }

  async function handleSkip() {
    // Skip without requiring selection — still flush any toggles already made.
    await persist.flush();
    await onSkip();
  }

  return (
    <section aria-labelledby="onboarding-equipment-title" className="space-y-5">
      <button
        className="text-muted-foreground hover:text-foreground -mb-2 text-xs underline underline-offset-2"
        type="button"
        onClick={onBack}
      >
        ‹ Retour
      </button>

      <div className="space-y-1 text-center">
        <h1 className="text-section-title" id="onboarding-equipment-title">
          Ton matériel
        </h1>
        <p className="text-muted-foreground text-sm text-pretty">
          Optionnel — précise ce que tu as vraiment pour adapter les séances. Tu pourras modifier ça
          plus tard dans Profil.
        </p>
      </div>

      <EquipmentInventoryView
        availableSports={availableSports}
        dirty={persist.dirty}
        equipment={persist.equipment}
        error={persist.error}
        message={persist.message}
        saving={persist.saving}
        showSectionTitle={false}
        update={persist.update}
      />

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          className="sm:mr-auto"
          disabled={busy || persist.saving}
          type="button"
          variant="ghost"
          onClick={() => void handleSkip()}
        >
          Passer
        </Button>
        <Button
          disabled={busy || persist.saving}
          type="button"
          onClick={() => void handleContinue()}
        >
          Continuer
        </Button>
      </div>
    </section>
  );
}
