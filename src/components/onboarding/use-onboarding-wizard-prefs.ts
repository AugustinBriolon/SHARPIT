'use client';

import { useCallback } from 'react';
import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import {
  disableProviderForClass,
  enableProviderForClass,
  setPrimaryForClass,
  type IntegrationSourcePrefs,
} from '@/lib/integrations/source-prefs';
import type { DataClassId } from '@/lib/integrations/provider-catalog';
import { patchOnboardingPrefs } from '@/components/onboarding/onboarding-wizard-api';

export function useOnboardingWizardPrefs(
  prefs: IntegrationSourcePrefs,
  setPrefs: React.Dispatch<React.SetStateAction<IntegrationSourcePrefs>>,
) {
  const handleToggleUse = useCallback(
    async (provider: IntegrationId, dataClass: DataClassId, enable: boolean) => {
      const optimistic = enable
        ? enableProviderForClass(prefs, dataClass, provider)
        : disableProviderForClass(prefs, dataClass, provider);
      setPrefs(optimistic);
      const next = await patchOnboardingPrefs(enable ? 'enable' : 'disable', dataClass, provider);
      setPrefs(next ?? prefs);
    },
    [prefs, setPrefs],
  );

  const handleSetPrimary = useCallback(
    async (provider: IntegrationId, dataClass: DataClassId) => {
      const optimistic = setPrimaryForClass(prefs, dataClass, provider);
      setPrefs(optimistic);
      const next = await patchOnboardingPrefs('setPrimary', dataClass, provider);
      setPrefs(next ?? prefs);
    },
    [prefs, setPrefs],
  );

  return { handleToggleUse, handleSetPrimary };
}
