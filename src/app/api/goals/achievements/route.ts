import { NextResponse } from 'next/server';
import { getRecentGoalAchievements } from '@/lib/goals/goal-achievements';

export async function GET(request: Request) {
  // Read search params before try so Cache Components prerender interrupts propagate.
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);

  try {
    const achievements = await getRecentGoalAchievements(limit);
    return NextResponse.json(achievements);
  } catch (error) {
    console.error('[goals/achievements/GET]', error);
    return NextResponse.json({ error: 'Impossible de charger l’historique' }, { status: 500 });
  }
}
