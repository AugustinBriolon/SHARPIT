import { Suspense } from 'react';
import { ProgressionHub } from '@/components/training/hub/progression-hub';
import { ProgressionHubSkeleton } from '@/components/training/hub/progression-hub-skeleton';
import { mapAthleteProfileToFormData } from '@/lib/profile/map-athlete-profile';
import { getAthleteProfile } from '@/lib/queries';

async function ProgressionHubWithProfile() {
  let athleteProfile = null;
  try {
    athleteProfile = await getAthleteProfile();
  } catch (error) {
    console.error('[training/progression] getAthleteProfile failed', error);
  }

  return <ProgressionHub initialProfile={mapAthleteProfileToFormData(athleteProfile)} />;
}

export default function TrainingProgressionPage() {
  return (
    <Suspense fallback={<ProgressionHubSkeleton />}>
      <ProgressionHubWithProfile />
    </Suspense>
  );
}
