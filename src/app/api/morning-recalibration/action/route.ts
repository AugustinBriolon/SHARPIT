import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  acceptMorningRecalibration,
  rejectMorningRecalibration,
} from '@/lib/morning-recalibration/service';

export const dynamic = 'force-dynamic';

const schema = z.object({
  decisionId: z.string().min(1),
  action: z.enum(['accept', 'reject']),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    const { decisionId, action } = parsed.data;
    if (action === 'accept') {
      const result = await acceptMorningRecalibration(decisionId);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 422 });
      }
      return NextResponse.json({ ok: true, sessionId: result.sessionId });
    }

    const result = await rejectMorningRecalibration(decisionId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[morning-recalibration/action]', error);
    return NextResponse.json({ error: 'Action impossible' }, { status: 500 });
  }
}
