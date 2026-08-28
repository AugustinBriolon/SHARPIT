import { OnboardingCredentialDialog } from '@/components/onboarding/onboarding-credential-dialog';
import type { DataClassId } from '@/lib/integrations/provider-catalog';
import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import type { IntegrationSourcePrefs } from '@/lib/integrations/source-prefs';

type CredentialProvider = Extract<IntegrationId, 'garmin' | 'renpho' | 'myfitnesspal'>;

export function OnboardingCredentialHost({
  credentialTarget,
  onTargetChange,
  onConnected,
}: {
  credentialTarget: { provider: CredentialProvider; dataClass: DataClassId } | null;
  onTargetChange: (target: { provider: CredentialProvider; dataClass: DataClassId } | null) => void;
  onConnected: (id: IntegrationId, nextPrefs?: IntegrationSourcePrefs) => void;
}) {
  return (
    <OnboardingCredentialDialog
      dataClass={credentialTarget?.dataClass ?? null}
      open={credentialTarget !== null}
      provider={credentialTarget?.provider ?? null}
      onConnected={(id, prefs) => onConnected(id, prefs ?? undefined)}
      onOpenChange={(open) => {
        if (!open) {
          onTargetChange(null);
        }
      }}
    />
  );
}
