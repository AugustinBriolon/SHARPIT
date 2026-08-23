import { redirect } from 'next/navigation';

/**
 * Progression is gone; its three tabs went where each of them belonged.
 *
 * Calibration is a settings panel and now lives in Settings. Records are a
 * physiological reading and live under Physiologie. État was the current form,
 * which the thread already carries. Bookmarks into the old tabs keep working
 * because the query decides which of the three the reader wanted.
 */
export default async function TrainingProgressionRedirect({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  if (tab === 'calibration') redirect('/settings/calibration');
  if (tab === 'records') redirect('/biology?tab=records');
  redirect('/training');
}
