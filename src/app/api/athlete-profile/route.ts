import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getAthleteProfile, upsertAthleteProfile } from '@/lib/queries';
import { athleteProfileSchema } from '@/lib/validators/athlete-profile';
import { invalidateCoachContext } from '@/lib/coach/coach-context';
import { normalizeAthleteEquipment } from '@/lib/equipment/parse';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

export async function GET() {
  try {
    const profile = await getAthleteProfile();
    return NextResponse.json(profile ?? { id: 'default' });
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
    const { equipment, ...rest } = parsed.data;
    const profile = await upsertAthleteProfile({
      ...rest,
      ...(equipment !== undefined
        ? {
            equipment:
              equipment === null
                ? null
                : (normalizeAthleteEquipment(equipment) as Prisma.InputJsonValue),
          }
        : {}),
    });
    if (equipment !== undefined) {
      invalidateCoachContext();
    }
    return NextResponse.json(profile);
  } catch (error) {
    return profileUpdateError(error);
  }
}
