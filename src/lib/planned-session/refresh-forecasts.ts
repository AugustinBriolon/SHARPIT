import { addDays, startOfDay } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { refreshAndPersistPlannedSessionContext } from '@/lib/planned-session/resolve-context';

export async function refreshPlannedSessionForecastsForDate(targetDate: Date): Promise<{
  refreshed: number;
  errors: string[];
}> {
  const day = startOfDay(targetDate);
  const nextDay = addDays(day, 1);

  const sessions = await prisma.plannedSession.findMany({
    where: {
      date: { gte: day, lt: nextDay },
      completed: false,
      exposureSetting: 'OUTDOOR',
    },
    select: { id: true },
  });

  let refreshed = 0;
  const errors: string[] = [];

  for (const session of sessions) {
    try {
      await refreshAndPersistPlannedSessionContext(session.id);
      refreshed += 1;
    } catch (error) {
      errors.push(`${session.id}: ${error instanceof Error ? error.message : 'refresh failed'}`);
    }
  }

  return { refreshed, errors };
}

/** Rafraîchit les prévisions J-1 (demain) et J (aujourd'hui). */
export async function refreshUpcomingPlannedSessionForecasts(): Promise<{
  today: { refreshed: number; errors: string[] };
  tomorrow: { refreshed: number; errors: string[] };
}> {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const [todayResult, tomorrowResult] = await Promise.all([
    refreshPlannedSessionForecastsForDate(today),
    refreshPlannedSessionForecastsForDate(tomorrow),
  ]);
  return { today: todayResult, tomorrow: tomorrowResult };
}
