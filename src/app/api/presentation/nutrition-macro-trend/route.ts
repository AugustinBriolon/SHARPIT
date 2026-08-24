import { NextRequest, NextResponse } from 'next/server';
import {
  NUTRITION_MACRO_TREND_GRANULARITIES,
  type NutritionMacroTrendGranularity,
} from '@/core/presentation/nutrition-macro-trend-view-model';
import { buildNutritionMacroTrendViewModel } from '@/lib/presentation/nutrition-macro-trend';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';

function isGranularity(value: string | null): value is NutritionMacroTrendGranularity {
  return (NUTRITION_MACRO_TREND_GRANULARITIES as readonly string[]).includes(value ?? '');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const granularityParam = searchParams.get('granularity');
  const granularity = isGranularity(granularityParam) ? granularityParam : 'week';

  try {
    const athleteId = await getCurrentAthleteId();
    const viewModel = await buildNutritionMacroTrendViewModel(athleteId, granularity);
    return NextResponse.json({ viewModel });
  } catch (error) {
    console.error('[api/presentation/nutrition-macro-trend]', error);
    return NextResponse.json(
      { error: 'Impossible de produire la tendance nutritionnelle' },
      { status: 500 },
    );
  }
}
