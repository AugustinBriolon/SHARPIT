import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pushStrengthWorkoutFromPlannedSession } from '@/lib/integrations/garmin-strength-workout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  plannedSessionId: z.string().min(1),
  schedule: z.boolean().optional(),
  scheduleDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await pushStrengthWorkoutFromPlannedSession(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[garmin/workouts/from-planned-session]', error);
    const message = error instanceof Error ? error.message : 'Envoi vers Garmin impossible';
    let status = 500;
    if (message.includes('non connecté') || message.includes('introuvable')) status = 404;
    else if (message.includes('Seules') || message.includes('Aucun')) status = 400;
    return NextResponse.json({ error: message }, { status });
  }
}
