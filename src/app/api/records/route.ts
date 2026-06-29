import { NextResponse } from "next/server";
import { getStoredRecords } from "@/lib/records";

export async function GET() {
  try {
    const records = await getStoredRecords();
    return NextResponse.json(records);
  } catch (error) {
    console.error("[api/records]", error);
    return NextResponse.json(
      { error: "Impossible de charger les records" },
      { status: 500 },
    );
  }
}
