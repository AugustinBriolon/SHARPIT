'use client';

import {
  OnboardingEquipmentActions,
  flushEquipmentAndContinue,
} from '@/components/onboarding/onboarding-equipment-step-parts';
import { OnboardingStepShell } from '@/components/onboarding/onboarding-step-shell';
import { EquipmentInventoryView } from '@/components/settings/equipment/inventory';
import { useEquipmentPersist } from '@/components/settings/equipment/use-equipment-persist';
import { EMPTY_ATHLETE_EQUIPMENT, type AthleteEquipment } from '@/lib/equipment/types';
import { equipmentSportsForPracticed, type PracticedSportId } from '@/lib/practiced-sports';
import { useMemo } from 'react';

export function OnboardingEquipmentStep({
  practicedSports,
  initialEquipment,
  busy,
  error,
  onContinue,
  onSkip,
}: {
  practicedSports: readonly PracticedSportId[];
  initialEquipment?: AthleteEquipment | null;
  busy: boolean;
  error: string | null;
  onContinue: () => void | Promise<void>;
  onSkip: () => void | Promise<void>;
}) {
  const persist = useEquipmentPersist(initialEquipment ?? EMPTY_ATHLETE_EQUIPMENT);
  const availableSports = useMemo(
    () => equipmentSportsForPracticed(practicedSports),
    [practicedSports],
  );
  const pending = busy || persist.saving;

  return (
    <OnboardingStepShell
      error={error}
      intro="Optionnel — précise ce que tu as vraiment pour adapter les séances. Tu pourras modifier ça plus tard dans Profil."
      title="Ton matériel"
      titleId="onboarding-equipment-title"
      actions={
        <OnboardingEquipmentActions
          pending={pending}
          onContinue={() => flushEquipmentAndContinue(persist.flush, onContinue)}
          onSkip={() => flushEquipmentAndContinue(persist.flush, onSkip)}
        />
      }
    >
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
    </OnboardingStepShell>
  );
}
