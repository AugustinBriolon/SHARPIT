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
  searchParams: Promise<{ tab?: string; sport?: string }>;
}) {
  const { tab, sport } = await searchParams;
  if (tab === 'records') {
    const sportQuery =
      sport === 'run' || sport === 'bike' || sport === 'swim' ? `&sport=${sport}` : '';
    redirect(`/progress?tab=performance${sportQuery}`);
  }
  redirect('/progress?tab=body');
}
