import { NextResponse } from 'next/server';
import { getRecentGoalAchievements } from '@/lib/goal-achievements';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);
    const achievements = await getRecentGoalAchievements(limit);
    return NextResponse.json(achievements);
  } catch (error) {
    console.error('[goals/achievements/GET]', error);
    return NextResponse.json({ error: 'Impossible de charger l’historique' }, { status: 500 });
  }
}
