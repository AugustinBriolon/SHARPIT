import { ProfileView } from '@/components/profile/profile-view';
import { getAthleteProfile } from '@/lib/queries';
import { birthDateToInput } from '@/lib/athlete-profile-utils';

export const dynamic = 'force-dynamic';

export default async function ProfilPage() {
  const athleteProfile = await getAthleteProfile().catch(() => null);

  return (
    <ProfileView
      initial={
        athleteProfile
          ? {
              heightCm: athleteProfile.heightCm,
              birthDate: birthDateToInput(athleteProfile.birthDate),
              ftpW: athleteProfile.ftpW,
              maxHr: athleteProfile.maxHr,
              lthr: athleteProfile.lthr,
              runThresholdPaceSecPerKm: athleteProfile.runThresholdPaceSecPerKm,
              vo2maxRunning: athleteProfile.vo2maxRunning,
              vo2maxCycling: athleteProfile.vo2maxCycling,
              thresholdsSyncedAt: athleteProfile.thresholdsSyncedAt?.toISOString() ?? null,
              sleepTargetMinutes: athleteProfile.sleepTargetMinutes,
              sleepBedtimeTargetMin: athleteProfile.sleepBedtimeTargetMin,
            }
          : null
      }
    />
  );
}
