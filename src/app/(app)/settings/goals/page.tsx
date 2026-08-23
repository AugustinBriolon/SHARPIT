import { redirect } from 'next/navigation';

/**
 * Blocking, because there is nothing to stream: a loading shell would render
 * and then immediately navigate away.
 */
export const instant = false;

/**
 * Goals govern the plan; they never configured the app.
 *
 * They sat in Settings for want of anywhere better — there was no surface for
 * athlete development. Progression is that surface (ADR-022).
 */
export default function SettingsGoalsRedirect() {
  redirect('/progress?tab=goals');
}
