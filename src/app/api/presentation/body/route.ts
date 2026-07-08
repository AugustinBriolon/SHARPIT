import { NextRequest, NextResponse } from 'next/server';
import { buildBodyPresentationViewModel } from '@/lib/presentation/body';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawDays = searchParams.get('days');

  let days: number | null | undefined = 90;
  if (rawDays == null) {
    days = 90;
  } else if (rawDays === 'all') {
    days = null;
  } else {
    const parsed = Number(rawDays);
    days = Number.isFinite(parsed) && parsed > 0 ? parsed : 90;
  }

  try {
    const viewModel = await buildBodyPresentationViewModel(days);
    return NextResponse.json({ viewModel });
  } catch (error) {
    console.error('[api/presentation/body]', error);
    return NextResponse.json({ error: 'Impossible de produire la vue Corps' }, { status: 500 });
  }
}
