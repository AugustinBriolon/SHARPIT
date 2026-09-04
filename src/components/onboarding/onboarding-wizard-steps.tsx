'use client';

import { FadePresence } from '@/components/motion';
import { OnboardingEquipmentStep } from '@/components/onboarding/onboarding-equipment-step';
import { OnboardingIntentionStep } from '@/components/onboarding/onboarding-intention-step';
import { OnboardingProgress } from '@/components/onboarding/onboarding-progress';
import { OnboardingProvidersStep } from '@/components/onboarding/onboarding-providers-step';
import { OnboardingSportsStep } from '@/components/onboarding/onboarding-sports-step';
import type { useOnboardingWizard } from '@/components/onboarding/use-onboarding-wizard';
import type { AthleteEquipment } from '@/lib/equipment/types';

type WizardState = ReturnType<typeof useOnboardingWizard>;

function OnboardingSportsStepView({ wizard }: { wizard: WizardState }) {
  return (
    <OnboardingSportsStep
      busy={wizard.busy}
      error={wizard.error}
      sports={wizard.sports}
      onContinue={() => void wizard.continueFromSports()}
      onSportsChange={wizard.setSports}
    />
  );
}

function OnboardingEquipmentStepView({
  wizard,
  initialEquipment,
}: {
  wizard: WizardState;
  initialEquipment?: AthleteEquipment | null;
}) {
  return (
    <OnboardingEquipmentStep
      busy={wizard.busy}
      error={wizard.error}
      initialEquipment={initialEquipment}
      practicedSports={wizard.sports}
      onContinue={() => wizard.clearErrorAndGo('intention')}
      onSkip={() => wizard.clearErrorAndGo('intention')}
    />
  );
}

function OnboardingIntentionStepView({ wizard }: { wizard: WizardState }) {
  return (
    <OnboardingIntentionStep
      error={wizard.error}
      practicedSports={wizard.sports}
      onSkip={() => wizard.clearErrorAndGo('providers')}
      onSubmit={async (payload) => {
        wizard.submitIntentionGoal(payload);
      }}
    />
  );
}

function OnboardingProvidersStepView({ wizard }: { wizard: WizardState }) {
  return (
    <OnboardingProvidersStep
      busy={wizard.busy}
      connected={wizard.connected}
      error={wizard.error}
      prefs={wizard.prefs}
      onConnect={wizard.handleConnect}
      onContinue={() => void wizard.finish()}
      onSetPrimary={wizard.handleSetPrimary}
      onToggleUse={wizard.handleToggleUse}
    />
  );
}

export function OnboardingWizardSteps({
  wizard,
  initialEquipment,
}: {
  wizard: WizardState;
  initialEquipment?: AthleteEquipment | null;
}) {
  const { step } = wizard;

  return (
    <FadePresence className="flex min-h-0 flex-1 flex-col" presenceKey={step} show>
      {step === 'sports' ? <OnboardingSportsStepView wizard={wizard} /> : null}
      {step === 'equipment' ? (
        <OnboardingEquipmentStepView initialEquipment={initialEquipment} wizard={wizard} />
      ) : null}
      {step === 'intention' ? <OnboardingIntentionStepView wizard={wizard} /> : null}
      {step === 'providers' ? <OnboardingProvidersStepView wizard={wizard} /> : null}
    </FadePresence>
  );
}

export function OnboardingWizardShell({
  wizard,
  initialEquipment,
}: {
  wizard: WizardState;
  initialEquipment?: AthleteEquipment | null;
}) {
  return (
    <div className="flex flex-1 flex-col gap-5 sm:gap-6">
      <OnboardingProgress
        backDisabled={wizard.busy}
        step={wizard.step}
        onBack={wizard.previousStep ? () => wizard.goBack(wizard.previousStep!) : undefined}
      />
      <OnboardingWizardSteps initialEquipment={initialEquipment} wizard={wizard} />
    </div>
  );
}
