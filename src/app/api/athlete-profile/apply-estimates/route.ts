import { NextResponse } from "next/server";
import {
  applyEstimatedThresholds,
  getThresholdApplyPreview,
} from "@/lib/threshold-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const preview = await getThresholdApplyPreview();
    return NextResponse.json(preview);
  } catch (error) {
    console.error("[apply-estimates]", error);
    return NextResponse.json(
      { error: "Impossible de calculer les estimations" },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const result = await applyEstimatedThresholds();
    if (!result.applied) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[apply-estimates]", error);
    return NextResponse.json(
      { error: "Impossible d'appliquer les seuils" },
      { status: 500 },
    );
  }
}
