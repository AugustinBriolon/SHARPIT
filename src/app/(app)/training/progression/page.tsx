import { ProgressionHub } from '@/components/training/hub/progression-hub';
import { mapAthleteProfileToFormData } from '@/lib/profile/map-athlete-profile';
import { getAthleteProfile } from '@/lib/queries';

export default async function TrainingProgressionPage() {
  let athleteProfile = null;
  try {
    athleteProfile = await getAthleteProfile();
  } catch (error) {
    console.error('[training/progression] getAthleteProfile failed', error);
  }

  return <ProgressionHub initialProfile={mapAthleteProfileToFormData(athleteProfile)} />;
}
