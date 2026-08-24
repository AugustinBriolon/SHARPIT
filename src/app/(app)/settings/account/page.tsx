import { ProfileView } from '@/components/profile/profile-view';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { mapAthleteProfileToFormData } from '@/lib/profile/map-athlete-profile';
import { getAthleteProfile } from '@/lib/queries';

export default async function SettingsAccountPage() {
  let loadError: string | null = null;
  let athleteProfile = null;
  try {
    const athleteId = await getCurrentAthleteId();
    athleteProfile = await getAthleteProfile(athleteId);
  } catch (error) {
    console.error('[settings/account] getAthleteProfile failed', error);
    loadError =
      'Chargement du profil impossible. Réessaie avant d’enregistrer — un enregistrement à vide effacerait tes données.';
  }

  return (
    <ProfileView initial={mapAthleteProfileToFormData(athleteProfile)} loadError={loadError} />
  );
}
