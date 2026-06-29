import { NextRequest, NextResponse } from "next/server";
import { ActivityType } from "@prisma/client";
import {
  buildActivityCreateData,
} from "@/lib/activity-service";
import { createActivity } from "@/lib/queries";
import { updateRecordsForTypesSafe } from "@/lib/records";
import { createActivitySchema } from "@/lib/validators/activity";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as ActivityType | null;
    const limit = searchParams.get("limit");

    const { getActivities } = await import("@/lib/queries");
    const activities = await getActivities({
      type: type && Object.values(ActivityType).includes(type) ? type : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de charger les séances" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createActivitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const activity = await createActivity(
      buildActivityCreateData(parsed.data) as Parameters<typeof createActivity>[0],
    );

    await updateRecordsForTypesSafe([parsed.data.type]);

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de créer la séance" },
      { status: 500 },
    );
  }
}
