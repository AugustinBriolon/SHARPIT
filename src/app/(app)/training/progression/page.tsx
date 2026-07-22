import { ProgressionHub } from '@/components/training/hub/progression-hub';
import { getAthleteProfile } from '@/lib/queries';

export default async function TrainingProgressionPage() {
  const athleteProfile = await getAthleteProfile().catch(() => null);

  return (
    <ProgressionHub
      initialProfile={
        athleteProfile
          ? {
              heightCm: athleteProfile.heightCm,
              birthDate: athleteProfile.birthDate?.toISOString() ?? null,
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
