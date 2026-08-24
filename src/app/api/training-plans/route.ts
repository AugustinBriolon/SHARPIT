import { startOfDay } from 'date-fns';
import { NextResponse } from 'next/server';
import { loadAthletePmcAnchor } from '@/lib/training/pmc-server';
import { generateMacroPlan } from '@/lib/training/periodization';
import { prisma } from '@/lib/prisma';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import {
  archiveActiveTrainingPlans,
  createTrainingPlan,
  getActiveTrainingPlan,
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
    const athleteId = await getCurrentAthleteId();
    const plan = await getActiveTrainingPlan(athleteId);
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

    const athleteId = await getCurrentAthleteId();
    const goal = await getGoalById(athleteId, parsed.data.goalId);
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

    // This scales the entire macro-plan: periodization derives the weekly load as
    // baselineCtl * 7. A truncated history here understates every week of the plan.
    const anchor = await loadAthletePmcAnchor(athleteId);
    const baselineCtl = anchor ? Math.round(anchor.ctl) : 40;

    const draft = generateMacroPlan({ raceDate, baselineCtl });
    const travels = await listTravelContexts(prisma, athleteId);
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

    await archiveActiveTrainingPlans(athleteId);

    const plan = await createTrainingPlan(athleteId, {
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
