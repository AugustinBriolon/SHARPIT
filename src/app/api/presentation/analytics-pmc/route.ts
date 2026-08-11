import { NextResponse } from 'next/server';
import { slicePmcWindow } from '@/lib/training/pmc';
import { loadAthletePmcPoints } from '@/lib/training/pmc-server';

/**
 * The PMC series for the analytics charts.
 *
 * Exists so the browser never computes a PMC. The Core's Training Stress needs
 * stored session features to derive it, which client code cannot read, so a
 * client-side computation silently falls back to the per-activity estimate and
 * reports a different CTL than every other surface. See ADR-011.
 */

/** Chart width. The recurrence still runs over the whole history before slicing. */
const CHART_DAYS = 180;

export async function GET() {
  try {
    const points = await loadAthletePmcPoints();
    return NextResponse.json({ pmc: slicePmcWindow(points, CHART_DAYS) });
  } catch (error) {
    console.error('[api/presentation/analytics-pmc]', error);
    return NextResponse.json({ error: 'Impossible de produire la série PMC' }, { status: 500 });
  }
}
