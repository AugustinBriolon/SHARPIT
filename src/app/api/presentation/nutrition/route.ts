import { NextResponse } from 'next/server';
import { buildNutritionViewModel } from '@/lib/presentation/nutrition';

export async function GET() {
  const viewModel = await buildNutritionViewModel();
  return NextResponse.json(viewModel);
}
