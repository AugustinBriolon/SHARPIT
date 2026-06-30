import { startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { computePmcSeries } from "@/lib/analytics";
import { generateMacroPlan } from "@/lib/periodization";
import {
  archiveActiveTrainingPlans,
  createTrainingPlan,
  getActivities,
  getGoalById,
} from "@/lib/queries";
import { z } from "zod";

const createPlanSchema = z.object({
  goalId: z.string().min(1),
});

export async function GET() {
  try {
    const { getActiveTrainingPlan } = await import("@/lib/queries");
    const plan = await getActiveTrainingPlan();
    return NextResponse.json(plan);
  } catch (error) {
    console.error("[training-plans]", error);
    return NextResponse.json(
      { error: "Impossible de charger le macro-plan" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "goalId requis" }, { status: 400 });
    }

    const goal = await getGoalById(parsed.data.goalId);
    if (!goal?.targetDate) {
      return NextResponse.json(
        { error: "Objectif introuvable ou sans date cible" },
        { status: 400 },
      );
    }

    const raceDate = startOfDay(goal.targetDate);
    if (raceDate < startOfDay(new Date())) {
      return NextResponse.json(
        { error: "La date de course est passée" },
        { status: 400 },
      );
    }

    const activities = await getActivities({ limit: 200 });
    const pmc = computePmcSeries(activities);
    const baselineCtl = pmc[pmc.length - 1]?.ctl ?? 40;

    const draft = generateMacroPlan({ raceDate, baselineCtl });

    await archiveActiveTrainingPlans();

    const plan = await createTrainingPlan({
      goalId: goal.id,
      raceDate,
      startDate: draft.startDate,
      baselineCtl: draft.baselineCtl,
      summary: draft.summary,
      status: "ACTIVE",
      weeks: draft.weeks.map((w) => ({
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
    console.error("[training-plans]", error);
    const message =
      error instanceof Error ? error.message : "Génération impossible";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
