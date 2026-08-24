import { NextRequest, NextResponse } from 'next/server';
import {
  NUTRITION_MACRO_TREND_GRANULARITIES,
  type NutritionMacroTrendGranularity,
} from '@/core/presentation/nutrition-macro-trend-view-model';
import { buildNutritionMacroTrendViewModel } from '@/lib/presentation/nutrition-macro-trend';

function isGranularity(value: string | null): value is NutritionMacroTrendGranularity {
  return (NUTRITION_MACRO_TREND_GRANULARITIES as readonly string[]).includes(value ?? '');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const granularityParam = searchParams.get('granularity');
  const granularity = isGranularity(granularityParam) ? granularityParam : 'week';

  try {
    const viewModel = await buildNutritionMacroTrendViewModel(granularity);
    return NextResponse.json({ viewModel });
  } catch (error) {
    console.error('[api/presentation/nutrition-macro-trend]', error);
    return NextResponse.json(
      { error: 'Impossible de produire la tendance nutritionnelle' },
      { status: 500 },
    );
  }
}
