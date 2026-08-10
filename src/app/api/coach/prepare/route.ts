import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildCoachContext } from '@/lib/coach/coach-context';

export const maxDuration = 60;

const bodySchema = z
  .object({
    /** Warm plan/adapt cache (scenario comparison included). Default: chat path. */
    includeScenario: z.boolean().optional(),
  })
  .optional();

/**
 * Warms the short-lived coach context cache so the first model call
 * (chat / plan / adapt / briefing) hits memory instead of rebuilding on the critical path.
 */
export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    const includeScenario = parsed.success ? parsed.data?.includeScenario === true : false;
    await buildCoachContext(new Date(), { includeScenario });
    return NextResponse.json({ ok: true, warmed: true, includeScenario });
  } catch (error) {
    console.error('[api/coach/prepare]', error);
    return NextResponse.json({ ok: false, error: 'Warm failed' }, { status: 500 });
  }
}
