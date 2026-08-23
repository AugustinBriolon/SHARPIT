import { redirect } from 'next/navigation';

/**
 * Superseded by the thread.
 *
 * This page mounted Calendar, Planning and History as three tabs — the same merge
 * the thread performs, but leaving the reader to switch between them and hold the
 * comparison in his head. That is the problem the thread was built to remove.
 */
export default function TrainingSessionsRedirect() {
  redirect('/training');
}
