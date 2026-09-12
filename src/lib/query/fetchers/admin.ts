import type { AccessTier } from '@prisma/client';
import { sendJson } from '@/lib/query/send-json';

export async function patchAthleteTier(athleteId: string, tier: AccessTier): Promise<void> {
  await sendJson(`/api/admin/athletes/${encodeURIComponent(athleteId)}/tier`, 'PATCH', { tier });
}
