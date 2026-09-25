import { redirect } from 'next/navigation';
import { MOI_PERSONALIZATION_DENSITY_HASH, MOI_PERSONALIZATION_PATH } from '@/lib/moi/paths';

/** Legacy deep link — Mode Expert lives on Personnalisation. */
export default function SettingsExpertModePage() {
  redirect(`${MOI_PERSONALIZATION_PATH}${MOI_PERSONALIZATION_DENSITY_HASH}`);
}
