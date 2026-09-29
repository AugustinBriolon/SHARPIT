import 'server-only';

import {
  enableProviderForAllCoveredClasses,
  removeProviderEverywhere,
} from '@sharpit/app/lib/integrations/source-prefs';
import { prisma } from '@sharpit/db/client';
import { persistSourcePrefsMutation } from '@sharpit/server/lib/integrations/source-prefs-store';

/**
 * Apple Health has no account to connect: the iPhone app says when its switch is on. Linking
 * for the first time enables it for every class it covers — as connecting a provider from the
 * settings does (ADR-027) — so an athlete with saved sources is not left with Apple Health
 * connected and ignored. Unlinking takes it out of every class. Idempotent both ways.
 */
export async function linkAppleHealth(athleteId: string, linked: boolean): Promise<void> {
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: athleteId },
    select: { appleHealthLinkedAt: true },
  });
  const isLinked = Boolean(profile?.appleHealthLinkedAt);
  if (linked === isLinked) {
    return;
  }
  await prisma.athleteProfile.update({
    where: { id: athleteId },
    data: { appleHealthLinkedAt: linked ? new Date() : null },
  });
  await persistSourcePrefsMutation(athleteId, (current) =>
    linked
      ? enableProviderForAllCoveredClasses(current, 'apple-health')
      : removeProviderEverywhere(current, 'apple-health'),
  );
}
