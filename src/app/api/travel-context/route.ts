import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  applyTravelContextToUpcomingSessions,
  createTravelContext,
  getActiveTravelContext,
  listTravelContexts,
} from '@/lib/travel-context/service';
import { refreshAndPersistPlannedSessionContext } from '@/lib/planned-session/resolve-context';

export const dynamic = 'force-dynamic';

const createSchema = z
  .object({
    type: z.enum(['TRAVEL', 'CONSTRAINT']).default('TRAVEL'),
    label: z.string().optional().nullable(),
    locationLabel: z.string().optional().nullable(),
    locationLat: z.number().optional().nullable(),
    locationLng: z.number().optional().nullable(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    note: z.string().optional().nullable(),
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
    const [active, all] = await Promise.all([
      getActiveTravelContext(prisma),
      listTravelContexts(prisma),
    ]);
    return NextResponse.json({ active, contexts: all });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible de charger le contexte voyage' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const travel = await createTravelContext(prisma, parsed.data);
    let updatedSessions = 0;

    if (parsed.data.type === 'TRAVEL' && parsed.data.applyToPlannedSessions !== false) {
      updatedSessions = await applyTravelContextToUpcomingSessions(prisma, travel.id);
      const sessions = await prisma.plannedSession.findMany({
        where: {
          date: { gte: travel.startDate, lte: travel.endDate },
          locationLat: travel.locationLat,
          locationLng: travel.locationLng,
        },
        select: { id: true },
      });
      for (const session of sessions) {
        try {
          await refreshAndPersistPlannedSessionContext(session.id);
        } catch (error) {
          console.error('[travel-context/refresh]', session.id, error);
        }
      }
    }

    return NextResponse.json({ travel, updatedSessions }, { status: 201 });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : 'Impossible de créer le contexte voyage';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
