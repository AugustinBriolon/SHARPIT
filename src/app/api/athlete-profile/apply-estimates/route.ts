import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  applyEstimatedThresholds,
  getThresholdApplyPreview,
} from '@/lib/threshold/threshold-service';

const bodySchema = z.object({
  /** Omitted = accept every proposed change, the historical behaviour. */
  fields: z.array(z.enum(['ftpW', 'runThresholdPaceSecPerKm', 'swimCssSecPer100m'])).optional(),
});

export async function GET() {
  try {
    const preview = await getThresholdApplyPreview();
    return NextResponse.json(preview);
  } catch (error) {
    console.error('[apply-estimates]', error);
    return NextResponse.json({ error: 'Impossible de calculer les estimations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Sélection invalide' }, { status: 400 });
    }

    const result = await applyEstimatedThresholds({ fields: parsed.data.fields });
    if (!result.applied) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('[apply-estimates]', error);
    return NextResponse.json({ error: "Impossible d'appliquer les seuils" }, { status: 500 });
  }
}
