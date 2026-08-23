import { redirect } from 'next/navigation';

/**
 * Blocking, because the query is the whole page.
 *
 * This route exists only to read `?tab=` and send the reader on. There is nothing
 * to stream a placeholder for — a fallback would render, then immediately
 * redirect — so it opts out of prerendering rather than wrapping a redirect in
 * Suspense.
 */
export const instant = false;

/**
 * Progression is gone; its three tabs went where each of them belonged.
 *
 * Calibration and records both live under Progression now — one is the
 * yardstick, the other the reading it scales. État was the current form, which
 * the thread already carries. Bookmarks into the old tabs keep working because
 * the query decides which of the three the reader wanted.
 */
export default async function TrainingProgressionRedirect({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  if (tab === 'calibration') redirect('/progress?tab=performance');
  if (tab === 'records') redirect('/progress?tab=performance');
  redirect('/training');
}
