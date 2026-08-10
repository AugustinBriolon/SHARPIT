import { cache } from 'react';
import { listCoachMemoryEntries } from '@/lib/coach-memory/service';
import { getGarminAccount } from '@/lib/integrations/garmin-sync';
import { getGoogleAccount, isGoogleConnected } from '@/lib/integrations/google-sync';
import { getRenphoAccount } from '@/lib/integrations/renpho-sync';
import { getStravaAccount } from '@/lib/integrations/strava-sync';
import { getWithingsAccount } from '@/lib/integrations/withings-sync';
import { prisma } from '@/lib/prisma';
import { getAthleteProfile, getGoals } from '@/lib/queries';
import {
  accountStatusLabel,
  equipmentFactsFromRaw,
  equipmentStatusLabel,
  goalsStatusLabel,
  integrationsStatusLabel,
  memoryStatusLabel,
  type SettingsHubStatus,
} from '@/lib/settings/hub-status';

const APP_VERSION = '0.1.0';

async function countConnectedIntegrations(): Promise<number> {
  const [strava, garmin, withings, renpho, google] = await Promise.all([
    getStravaAccount().catch(() => null),
    getGarminAccount().catch(() => null),
    getWithingsAccount().catch(() => null),
    getRenphoAccount().catch(() => null),
    getGoogleAccount().catch(() => null),
  ]);

  return [
    Boolean(strava),
    Boolean(garmin),
    Boolean(withings),
    Boolean(renpho),
    isGoogleConnected(google),
  ].filter(Boolean).length;
}

/**
 * Per-request memoized read for the settings hub. Each status chip streams into
 * its own Suspense boundary, so the loader is called once per chip and deduped
 * to a single round of queries here.
 */
export const getSettingsHubStatus = cache(loadSettingsHubStatus);

/** Server snapshot for settings hub status chips. Failures degrade to neutral copy. */
export async function loadSettingsHubStatus(): Promise<SettingsHubStatus> {
  const [profile, goals, memory, connectedCount] = await Promise.all([
    getAthleteProfile().catch(() => null),
    getGoals().catch(() => []),
    listCoachMemoryEntries(prisma).catch(() => null),
    countConnectedIntegrations().catch(() => 0),
  ]);

  const activeEntries = goals.filter((goal) => !goal.achieved);
  const activeRaces = activeEntries.filter((goal) => goal.kind === 'RACE').length;
  const activeMemory = memory?.entries.find((entry) => entry.isActive) ?? null;
  const activeLabel =
    activeMemory?.locationLabel?.trim() ||
    activeMemory?.label?.trim() ||
    (activeMemory ? 'Actif' : null);

  return {
    account: accountStatusLabel({
      heightCm: profile?.heightCm,
      birthDate: profile?.birthDate,
      sleepTargetMinutes: profile?.sleepTargetMinutes,
      sleepBedtimeTargetMin: profile?.sleepBedtimeTargetMin,
    }),
    equipment: equipmentStatusLabel(equipmentFactsFromRaw(profile?.equipment ?? null)),
    goals: goalsStatusLabel({
      total: activeEntries.length,
      activeRaces,
    }),
    memory: memoryStatusLabel({
      entryCount: memory?.entries.length ?? 0,
      hasProfileContext: Boolean(memory?.profileContext?.trim()),
      activeLabel,
    }),
    integrations: integrationsStatusLabel({ connectedCount }),
    about: `v${APP_VERSION}`,
  };
}
