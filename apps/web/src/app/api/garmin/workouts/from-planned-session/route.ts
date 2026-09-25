import { ActivityType } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pushEnduranceWorkoutFromPlannedSession } from '@/lib/integrations/garmin/garmin-endurance-workout';
import { pushStrengthWorkoutFromPlannedSession } from '@/lib/integrations/garmin/garmin-strength-workout';
import { GarminWorkoutAlreadyPushedError } from '@/lib/integrations/garmin/garmin-workout-push';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { prisma } from '@/lib/prisma';

const bodySchema = z.object({
  plannedSessionId: z.string().min(1),
  schedule: z.boolean().optional(),
  force: z.boolean().optional(),
  scheduleDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

type PushInput = z.infer<typeof bodySchema>;

/** Strength and endurance build different payloads from different prescriptions. */
async function pushBySport(athleteId: string, input: PushInput) {
  const session = await prisma.plannedSession.findFirst({
    where: { id: input.plannedSessionId, athleteId },
    select: { type: true },
  });
  if (!session) {
    throw new Error('Séance planifiée introuvable');
  }

  return session.type === ActivityType.STRENGTH
    ? pushStrengthWorkoutFromPlannedSession(athleteId, input)
    : pushEnduranceWorkoutFromPlannedSession(athleteId, input);
}

function garminPushErrorStatus(message: string) {
  if (message.includes('non connecté') || message.includes('introuvable')) {
    return 404;
  }
  if (message.includes('Seules') || message.includes('Aucun')) {
    return 400;
  }
  return 500;
}

export async function POST(request: NextRequest) {
  try {
    const athleteId = await getCurrentAthleteId();
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(await pushBySport(athleteId, parsed.data));
  } catch (error) {
    if (error instanceof GarminWorkoutAlreadyPushedError) {
      return NextResponse.json(
        {
          error: error.body.message,
          alreadyPushed: true,
          ...error.body,
        },
        { status: 409 },
      );
    }
    console.error('[garmin/workouts/from-planned-session]', error);
    const message = error instanceof Error ? error.message : 'Envoi vers Garmin impossible';
    return NextResponse.json({ error: message }, { status: garminPushErrorStatus(message) });
  }
}
