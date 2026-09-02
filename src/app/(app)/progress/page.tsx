import { redirect } from 'next/navigation';
import { resolveProgressLegacyRedirect } from '@/lib/moi/paths';

/**
 * Blocking: legacy Progression hub is split into dedicated Moi surfaces.
 * Bookmarks `/progress?tab=` keep working via redirect.
 */
export const instant = false;

export default async function ProgressRedirect({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; sport?: string }>;
}) {
  const { tab, sport } = await searchParams;
  redirect(resolveProgressLegacyRedirect({ tab, sport }));
}
