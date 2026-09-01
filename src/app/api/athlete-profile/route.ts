import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { getAthleteProfile, upsertAthleteProfile } from '@/lib/queries';
import { athleteProfileSchema, type AthleteProfileInput } from '@/lib/validators/athlete-profile';
import { invalidateCoachContext } from '@/lib/coach/context/coach-context';
import { normalizeAthleteEquipment } from '@/lib/equipment/parse';
import { sanitizePracticedSportsForPersist } from '@/lib/practiced-sports';
import { DEFAULT_DISPLAY_MODE } from '@/lib/preferences/display-mode';

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

export async function GET() {
  try {
    const athleteId = await getCurrentAthleteId();
    const profile = await getAthleteProfile(athleteId);
    // An athlete with no profile row still has a reading density — the default one.
    return NextResponse.json(profile ?? { id: athleteId, displayMode: DEFAULT_DISPLAY_MODE });
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
    const { equipment, practicedSports, ...rest } = parsed.data;
    const athleteId = await getCurrentAthleteId();
    const profile = await upsertAthleteProfile(athleteId, {
      ...rest,
      ...equipmentPatch(equipment),
      ...practicedSportsPatch(practicedSports),
    });
    // Any profile field can affect coach prompts / twin — clear the 30s cache.
    invalidateCoachContext();
    return NextResponse.json(profile);
  } catch (error) {
    return profileUpdateError(error);
  }
}
