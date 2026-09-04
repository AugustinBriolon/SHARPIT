'use client';

import { Button } from '@/components/ui/button';

export function OnboardingEquipmentActions({
  pending,
  onContinue,
  onSkip,
}: {
  pending: boolean;
  onContinue: () => void | Promise<void>;
  onSkip: () => void | Promise<void>;
}) {
  return (
    <>
      <Button
        className="sm:mr-auto"
        disabled={pending}
        type="button"
        variant="ghost"
        onClick={() => void onSkip()}
      >
        Passer
      </Button>
      <Button
        className="w-full sm:w-auto"
        disabled={pending}
        type="button"
        onClick={() => void onContinue()}
      >
        Continuer
      </Button>
    </>
  );
}

export async function flushEquipmentAndContinue(
  flush: () => Promise<void>,
  next: () => void | Promise<void>,
) {
  await flush();
  await next();
}
