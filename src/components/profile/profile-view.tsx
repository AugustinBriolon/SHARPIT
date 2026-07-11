import { CorpsPanel, CorpsSectionHeader } from '@/components/corps/corps-ui';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { ProfileAiSummary } from '@/components/profile/profile-ai-summary';
import { ProfileContextForm } from '@/components/profile/profile-context-form';
import { AthleteProfilePanel } from '@/components/settings/athlete-profile-panel';

interface ProfileData {
  heightCm: number | null;
  birthDate: string | null;
  ftpW: number | null;
  maxHr: number | null;
  lthr: number | null;
  runThresholdPaceSecPerKm: number | null;
  vo2maxRunning: number | null;
  vo2maxCycling: number | null;
  thresholdsSyncedAt: string | null;
  sleepTargetMinutes: number | null;
  sleepBedtimeTargetMin: number | null;
}

export function ProfileView({ initial }: { initial: ProfileData | null }) {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Réglages" showOnDesktop />
      <StickyHeader>
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Profil
        </p>
        <h1 className="font-heading mt-1 text-2xl font-semibold">Mon identité sportive</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Seuils, contraintes et préférences — tout ce que SHARPIT utilise pour personnaliser le
          coaching et le planning.
        </p>
      </StickyHeader>

      <ProfileAiSummary />

      <CorpsPanel className="py-5">
        <AthleteProfilePanel initial={initial} />
      </CorpsPanel>

      <CorpsPanel className="space-y-4 py-5">
        <CorpsSectionHeader
          description="Disponibilités, contraintes pro, préférences d'entraînement — priorité haute pour le coach IA."
          label="Contexte"
          title="Mon contexte"
        />
        <ProfileContextForm />
      </CorpsPanel>
    </div>
  );
}
