import { NextRequest, NextResponse } from 'next/server';
import { MfpExportFormatError } from '@sharpit/app/lib/nutrition/import/mfp-export';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { importMfpExport } from '@sharpit/server/lib/nutrition/import/mfp-export-import';
import {
  checkRateLimit,
  rateLimitJsonResponse,
  rateLimiters,
} from '@sharpit/server/lib/rate-limit';

/**
 * `POST /api/v1/food-log/import/myfitnesspal` — the athlete's MyFitnessPal export (ADR-062),
 * as the ZIP MFP emails or its nutrition CSV, in the multipart field `file`.
 */

/** Years of meal totals weigh a few hundred kilobytes; Vercel refuses bodies past 4.5 MB. */
const MAX_BYTES = 4 * 1024 * 1024;

const badRequest = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function uploadedBytes(request: NextRequest): Promise<Uint8Array | NextResponse> {
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') {
    return badRequest('Ajoute le fichier de ton export MyFitnessPal.');
  }
  if (file.size > MAX_BYTES) {
    return badRequest('Fichier trop lourd (4 Mo maximum).', 413);
  }
  return new Uint8Array(await file.arrayBuffer());
}

export async function POST(request: NextRequest) {
  try {
    const athleteId = await getCurrentAthleteId();
    const rateLimit = await checkRateLimit(rateLimiters.nutritionImport, athleteId);
    if (!rateLimit.ok) {
      return NextResponse.json(rateLimitJsonResponse(rateLimit).body, { status: 429 });
    }
    const bytes = await uploadedBytes(request);
    if (bytes instanceof NextResponse) {
      return bytes;
    }
    return NextResponse.json(await importMfpExport(athleteId, bytes));
  } catch (error) {
    if (error instanceof MfpExportFormatError) {
      return badRequest(error.message);
    }
    console.error('[api/v1/food-log] mfp import', error);
    return NextResponse.json({ error: 'Import impossible pour le moment.' }, { status: 500 });
  }
}
