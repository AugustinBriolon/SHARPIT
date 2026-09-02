import { redirect } from 'next/navigation';
import { MOI_CORPS_PATH, MOI_PERFORMANCE_PATH } from '@/lib/moi/paths';

/**
 * Blocking, because the query is the whole page.
 *
 * The body hub is gone; bookmarks into composition / suivi / records keep
 * working by landing on dedicated Moi surfaces.
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
      sport === 'run' || sport === 'bike' || sport === 'swim' ? `?sport=${sport}` : '';
    redirect(`${MOI_PERFORMANCE_PATH}${sportQuery}`);
  }
  redirect(MOI_CORPS_PATH);
}
