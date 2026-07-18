import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createTravelMemoryEntry, listCoachMemoryEntries } from '@/lib/coach-memory/service';
import { applyTravelContextToUpcomingSessions } from '@/lib/travel-context/service';
import { refreshAndPersistPlannedSessionContext } from '@/lib/planned-session/resolve-context';

export const dynamic = 'force-dynamic';

const travelDisciplineSchema = z.enum(['RUN', 'BIKE', 'SWIM', 'STRENGTH', 'MOBILITY']);

const travelPayloadSchema = z
  .object({
    type: z.enum(['TRAVEL', 'CONSTRAINT']).default('TRAVEL'),
    label: z.string().optional().nullable(),
    /** Required for TRAVEL only — a Contrainte has no place. */
    locationLabel: z.string().optional().nullable(),
    locationLat: z.number().optional().nullable(),
    locationLng: z.number().optional().nullable(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    note: z.string().optional().nullable(),
    trainingConstraint: z.enum(['FULL', 'REDUCED', 'MOBILITY_ONLY', 'NONE']).optional().nullable(),
    allowedDisciplines: z.array(travelDisciplineSchema).optional().nullable(),
    noStructuredTraining: z.boolean().optional(),
    applyToPlannedSessions: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'TRAVEL' && (!data.locationLabel || data.locationLabel.trim().length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['locationLabel'],
        message: 'Un lieu est requis pour un déplacement.',
      });
    }
  });

export async function GET() {
  try {
    const data = await listCoachMemoryEntries(prisma);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible de charger la mémoire du coach' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = travelPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.endDate < parsed.data.startDate) {
      return NextResponse.json(
        { error: 'La date de fin doit être postérieure à la date de début' },
        { status: 400 },
      );
    }

    const entry = await createTravelMemoryEntry(prisma, {
      ...parsed.data,
      source: 'USER',
    });

    let updatedSessions = 0;
    // Nothing to push to planned sessions for a Contrainte — it has no location.
    if (parsed.data.type === 'TRAVEL' && parsed.data.applyToPlannedSessions !== false) {
      updatedSessions = await applyTravelContextToUpcomingSessions(prisma, entry.id);
      const sessions = await prisma.plannedSession.findMany({
        where: {
          date: {
            gte: new Date(parsed.data.startDate),
            lte: new Date(parsed.data.endDate),
          },
          locationLat: entry.locationLat ?? undefined,
          locationLng: entry.locationLng ?? undefined,
        },
        select: { id: true },
      });
      for (const session of sessions) {
        try {
          await refreshAndPersistPlannedSessionContext(session.id);
        } catch (error) {
          console.error('[coach-memory/refresh]', session.id, error);
        }
      }
    }

    return NextResponse.json({ entry, updatedSessions }, { status: 201 });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : 'Impossible de créer l’entrée de mémoire';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
