import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { getAthleteProfile, upsertAthleteProfile } from '@sharpit/server/lib/queries';
import { mergeFeaturePrefs, resolveFeaturePrefs } from '@sharpit/server/lib/features/feature-prefs';
import {
  athleteProfileSchema,
  type AthleteProfileInput,
} from '@sharpit/server/lib/validators/athlete-profile';
import { invalidateCoachContext } from '@sharpit/server/lib/coach/context/coach-context';
import { normalizeAthleteEquipment } from '@sharpit/app/lib/equipment/parse';
import { sanitizePracticedSportsForPersist } from '@sharpit/app/lib/practiced-sports';
import { sanitizeTrainingAvailabilityForPersist } from '@sharpit/server/lib/training-availability/parse';
import { DEFAULT_DISPLAY_MODE } from '@sharpit/app/lib/preferences/display-mode';
import { accessTierSetCookieValue } from '@sharpit/app/lib/access/tier-cookie';
import { hasBearer } from '@sharpit/app/lib/hosts/api-host';
import {
  mergeNotificationPrefs,
  resolveNotificationPrefs,
} from '@sharpit/server/lib/notifications/notification-prefs';

/**
 * The tier cookie is a display hint for the web UI's session. A Bearer client — the iOS app on
 * `api.sharpit.app`, which must never receive a cookie — gets the tier in the body only.
 */
function withAccessTierCookie(request: NextRequest, response: NextResponse, tier: 'FREE' | 'PRO') {
  if (!hasBearer(request)) {
    response.headers.append('Set-Cookie', accessTierSetCookieValue(tier));
  }
  return response;
}

function profileUpdateError(error: unknown) {
  console.error('[athlete-profile PATCH]', error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2022') {
      return NextResponse.json(
        {
          error:
            'Schéma base de données incomplet. Lance « npm run db:migrate:deploy » puis redémarre le serveur.',
        },
        { status: 503 },
      );
    }
  }

  const detail = error instanceof Error ? error.message : undefined;
  return NextResponse.json(
    {
      error: 'Impossible de mettre à jour le profil athlète',
      ...(detail ? { detail } : {}),
    },
    { status: 500 },
  );
}

function equipmentPatch(
  equipment: AthleteProfileInput['equipment'],
): { equipment: Prisma.InputJsonValue | null } | Record<string, never> {
  if (equipment === undefined) {
    return {};
  }
  if (equipment === null) {
    return { equipment: null };
  }
  return { equipment: normalizeAthleteEquipment(equipment) as Prisma.InputJsonValue };
}

function practicedSportsPatch(
  practicedSports: AthleteProfileInput['practicedSports'],
): { practicedSports: Prisma.InputJsonValue | null } | Record<string, never> {
  if (practicedSports === undefined) {
    return {};
  }
  if (practicedSports === null) {
    return { practicedSports: null };
  }
  const sanitized = sanitizePracticedSportsForPersist(practicedSports) ?? {
    version: 1 as const,
    sports: [],
  };
  return { practicedSports: sanitized as Prisma.InputJsonValue };
}

function trainingAvailabilityPatch(
  trainingAvailability: AthleteProfileInput['trainingAvailability'],
): { trainingAvailability: Prisma.InputJsonValue | null } | Record<string, never> {
  if (trainingAvailability === undefined) {
    return {};
  }
  if (trainingAvailability === null) {
    return { trainingAvailability: null };
  }
  return {
    trainingAvailability: sanitizeTrainingAvailabilityForPersist(
      trainingAvailability,
    ) as Prisma.InputJsonValue,
  };
}

/**
 * Merges the PATCH over what is stored, so the column always holds a full v1 —
 * a partial toggle never drops the other preferences.
 */
async function notificationPrefsPatch(
  athleteId: string,
  patch: AthleteProfileInput['notificationPrefs'],
): Promise<{ notificationPrefs: Prisma.InputJsonValue } | Record<string, never>> {
  if (patch === undefined) {
    return {};
  }
  const stored = (await getAthleteProfile(athleteId))?.notificationPrefs ?? null;
  return { notificationPrefs: mergeNotificationPrefs(stored, patch) as Prisma.InputJsonValue };
}

/** Same merge for the features the athlete uses: one toggle never drops the others. */
async function featurePrefsPatch(
  athleteId: string,
  patch: AthleteProfileInput['featurePrefs'],
): Promise<{ featurePrefs: Prisma.InputJsonValue } | Record<string, never>> {
  if (patch === undefined) {
    return {};
  }
  const stored = (await getAthleteProfile(athleteId))?.featurePrefs ?? null;
  return { featurePrefs: mergeFeaturePrefs(stored, patch) as Prisma.InputJsonValue };
}

/** The profile as served: notification and feature prefs always resolved, defaults included. */
function withResolvedPrefs<T extends object>(profile: T) {
  const stored = 'notificationPrefs' in profile ? profile.notificationPrefs : null;
  const features = 'featurePrefs' in profile ? profile.featurePrefs : null;
  return {
    ...profile,
    notificationPrefs: resolveNotificationPrefs(stored),
    featurePrefs: resolveFeaturePrefs(features),
  };
}

export async function GET(request: NextRequest) {
  try {
    const athleteId = await getCurrentAthleteId();
    const profile = await getAthleteProfile(athleteId);
    // An athlete with no profile row still has a reading density — the default one. And no row
    // means the first-login wizard was never finished: said explicitly, since a client that
    // sees no `onboardingCompletedAt` at all must not take the wizard for done.
    const payload = profile ?? {
      id: athleteId,
      displayMode: DEFAULT_DISPLAY_MODE,
      tier: 'FREE' as const,
      onboardingCompletedAt: null,
    };
    const response = NextResponse.json(withResolvedPrefs(payload));
    return withAccessTierCookie(request, response, payload.tier ?? 'FREE');
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de charger le profil athlète' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 });
  }

  const parsed = athleteProfileSchema.safeParse(body);
  if (!parsed.success) {
    const { fieldErrors, formErrors } = parsed.error.flatten();
    const detail = [...Object.values(fieldErrors).flat(), ...formErrors]
      .filter(Boolean)
      .join(' · ');
    return NextResponse.json(
      { error: detail || 'Données invalides', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const {
      equipment,
      practicedSports,
      trainingAvailability,
      notificationPrefs,
      featurePrefs,
      ...rest
    } = parsed.data;
    const athleteId = await getCurrentAthleteId();
    const profile = await upsertAthleteProfile(athleteId, {
      ...rest,
      ...equipmentPatch(equipment),
      ...practicedSportsPatch(practicedSports),
      ...trainingAvailabilityPatch(trainingAvailability),
      ...(await notificationPrefsPatch(athleteId, notificationPrefs)),
      ...(await featurePrefsPatch(athleteId, featurePrefs)),
    });
    // Any profile field can affect coach prompts / twin — clear the 30s cache.
    invalidateCoachContext();
    const response = NextResponse.json(withResolvedPrefs(profile));
    return withAccessTierCookie(request, response, profile.tier ?? 'FREE');
  } catch (error) {
    return profileUpdateError(error);
  }
}
