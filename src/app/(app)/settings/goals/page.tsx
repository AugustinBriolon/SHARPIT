import { redirect } from 'next/navigation';
import { MOI_OBJECTIFS_PATH } from '@/lib/moi/paths';

/**
 * Blocking, because there is nothing to stream: a loading shell would render
 * and then immediately navigate away.
 */
export const instant = false;

/**
 * Goals govern the plan; they never configured the app.
 *
 * They sat in Settings for want of anywhere better — there was no surface for
 * athlete development. Moi → Objectifs is that surface (ADR-022 / Shell V1.1).
 */
export default function SettingsGoalsRedirect() {
  redirect(MOI_OBJECTIFS_PATH);
}
