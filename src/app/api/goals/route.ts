import { NextRequest, NextResponse } from "next/server";
import { createGoal, getGoals } from "@/lib/queries";
import { createGoalSchema } from "@/lib/validators/goal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const goals = await getGoals();
    return NextResponse.json(goals);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de charger les objectifs" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createGoalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const goal = await createGoal(
      parsed.data as Parameters<typeof createGoal>[0],
    );
    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de créer l'objectif" },
      { status: 500 },
    );
  }
}
