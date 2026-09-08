import { redirect } from 'next/navigation';
import { MOI_HUB_PATH } from '@/lib/moi/paths';

/** Legacy route — Support mailto lives on `/moi` now. */
export default function SettingsFeedbackRedirectPage() {
  redirect(MOI_HUB_PATH);
}
