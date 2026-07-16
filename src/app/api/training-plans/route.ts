import { startOfDay } from 'date-fns';
import { NextResponse } from 'next/server';
import { computePmcSeries } from '@/lib/analytics';
import { generateMacroPlan } from '@/lib/periodization';
import { prisma } from '@/lib/prisma';
import {
  archiveActiveTrainingPlans,
  createTrainingPlan,
  getActiveTrainingPlan,
  getActivitiesList,
  getGoalById,
} from '@/lib/queries';
import { listTravelContexts } from '@/lib/travel-context/service';
import { applyTravelConstraintsToMacroWeeks } from '@/lib/travel-context/training-constraint';
import { z } from 'zod';

const createPlanSchema = z.object({
  goalId: z.string().min(1),
});

export async function GET() {
  try {
    const plan = await getActiveTrainingPlan();
    return NextResponse.json(plan);
  } catch (error) {
    console.error('[training-plans]', error);
    return NextResponse.json({ error: 'Impossible de charger le macro-plan' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'goalId requis' }, { status: 400 });
    }

    const goal = await getGoalById(parsed.data.goalId);
    if (!goal?.targetDate) {
      return NextResponse.json(
        { error: 'Objectif introuvable ou sans date cible' },
        { status: 400 },
      );
    }

    const raceDate = startOfDay(goal.targetDate);
    if (raceDate < startOfDay(new Date())) {
      return NextResponse.json({ error: 'La date de course est passée' }, { status: 400 });
    }

    const activities = await getActivitiesList({ limit: 200 });
    const pmc = computePmcSeries(activities);
    const baselineCtl = pmc[pmc.length - 1]?.ctl ?? 40;

    const draft = generateMacroPlan({ raceDate, baselineCtl });
    const travels = await listTravelContexts(prisma);
    const weeks = applyTravelConstraintsToMacroWeeks(
      draft.weeks,
      travels.map((t) => ({
        startDate: t.startDate,
        endDate: t.endDate,
        label: t.label,
        trainingConstraint: t.trainingConstraint,
        allowedDisciplines: t.allowedDisciplines,
      })),
    );
    const travelAdjusted = weeks.some(
      (w, i) => w.targetLoad !== draft.weeks[i]?.targetLoad || w.focus !== draft.weeks[i]?.focus,
    );
    const summary = travelAdjusted
      ? `${draft.summary} Semaines ajustées selon les déplacements (contrainte d’entraînement).`
      : draft.summary;

    await archiveActiveTrainingPlans();

    const plan = await createTrainingPlan({
      goalId: goal.id,
      raceDate,
      startDate: draft.startDate,
      baselineCtl: draft.baselineCtl,
      summary,
      status: 'ACTIVE',
      weeks: weeks.map((w) => ({
        weekStart: w.weekStart,
        weekIndex: w.weekIndex,
        phase: w.phase,
        targetLoad: w.targetLoad,
        targetHours: w.targetHours,
        focus: w.focus,
        isDeload: w.isDeload,
      })),
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error('[training-plans]', error);
    const message = error instanceof Error ? error.message : 'Génération impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
