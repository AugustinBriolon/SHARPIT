import { redirect } from 'next/navigation';

/**
 * Superseded by the Activité hub (`/activite`).
 *
 * History is the hub workflow (list + Nouvelle activité), not a separate Accès
 * destination. Keep this redirect so Progress / thread deep links still resolve.
 */
export default function TrainingHistoryRedirect() {
  redirect('/activite');
}
