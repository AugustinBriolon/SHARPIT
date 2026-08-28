import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { applyScenarioComparisonChoice } from '@/lib/scenario/apply-scenario';

const VALID_HORIZONS = new Set([1, 3, 7, 14]);

const schema = z.object({
  scenarioId: z.string().min(1),
  horizonDays: z.number().int().optional(),
  anchorTrainingDayId: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    const { scenarioId, horizonDays, anchorTrainingDayId } = parsed.data;
    if (horizonDays !== undefined && !VALID_HORIZONS.has(horizonDays)) {
      return NextResponse.json({ error: 'horizonDays doit être 1, 3, 7 ou 14' }, { status: 400 });
    }

    const athleteId = await getCurrentAthleteId();
    const result = await applyScenarioComparisonChoice(athleteId, {
      scenarioId,
      horizonDays: (horizonDays ?? 7) as ProjectionHorizonDays,
      anchorTrainingDayId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/scenario-comparison/apply]', error);
    return NextResponse.json({ error: "Impossible d'appliquer le scénario" }, { status: 500 });
  }
}
