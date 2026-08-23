import { redirect } from 'next/navigation';

/**
 * Blocking, because the query is the whole page.
 *
 * The body hub is gone; its three tabs split by the question they answer.
 * Composition and suivi are readings of the body and stay together under
 * Progression; records say what the athlete produced, which is performance.
 * Bookmarks into any of the three keep working because the query decides.
 */
export const instant = false;

export default async function BiologyRedirect({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  if (tab === 'records') redirect('/progress?tab=performance');
  redirect('/progress?tab=body');
}
