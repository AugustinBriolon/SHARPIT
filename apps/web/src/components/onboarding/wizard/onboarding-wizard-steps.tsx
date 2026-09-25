'use client';

import { FadePresence } from '@/components/motion';
import { OnboardingAvailabilityStep } from '@/components/onboarding/steps/onboarding-availability-step';
import { OnboardingEquipmentStep } from '@/components/onboarding/steps/onboarding-equipment-step';
import { patchTrainingAvailability } from '@/components/onboarding/wizard/onboarding-wizard-api';
import { OnboardingIntentionStep } from '@/components/onboarding/steps/onboarding-intention-step';
import { OnboardingStepProgressProvider } from '@/components/onboarding/steps/onboarding-step-progress-context';
import { OnboardingProvidersStep } from '@/components/onboarding/steps/onboarding-providers-step';
import { OnboardingSportsStep } from '@/components/onboarding/steps/onboarding-sports-step';
import type { useOnboardingWizard } from '@/components/onboarding/wizard/use-onboarding-wizard';
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
      onContinue={() => wizard.clearErrorAndGo('availability')}
      onSkip={() => wizard.clearErrorAndGo('availability')}
    />
  );
}

function OnboardingAvailabilityStepView({ wizard }: { wizard: WizardState }) {
  const leave = async () => {
    await patchTrainingAvailability(wizard.availability);
    wizard.clearErrorAndGo('intention');
  };

  return (
    <OnboardingAvailabilityStep
      availability={wizard.availability}
      busy={wizard.busy}
      error={wizard.error}
      onChange={wizard.setAvailability}
      onContinue={leave}
      onSkip={leave}
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
      {step === 'availability' ? <OnboardingAvailabilityStepView wizard={wizard} /> : null}
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
  // The rail travels inside the step shell's sticky header so it stays glued to
  // the step title rather than scrolling away above it.
  return (
    <div className="flex flex-1 flex-col">
      <OnboardingStepProgressProvider
        backDisabled={wizard.busy}
        step={wizard.step}
        onBack={wizard.previousStep ? () => wizard.goBack(wizard.previousStep!) : undefined}
      >
        <OnboardingWizardSteps initialEquipment={initialEquipment} wizard={wizard} />
      </OnboardingStepProgressProvider>
    </div>
  );
}
