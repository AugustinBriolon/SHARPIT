import type { Goal } from '@prisma/client';
import {
  inferPerformanceEndMode,
  isGoalExpired,
  parseGoalMetricConfig,
  type GoalMetricConfig,
} from '@/lib/goals/goal-metric-config';
import { prisma } from '@/lib/prisma';
import {
  computeMetricCurrentValue,
  computePerformanceBest,
  buildPeriodKey,
  loadActivitiesForGoals,
  loadAllActivitiesForPerformance,
  type ActivityRow,
} from '@/lib/goals/goal-activity-progress';

export const PERFORMANCE_PERIOD_KEY = '_performance';

function isReached(
  currentValue: number | null,
  targetValue: number | null,
  lowerIsBetter: boolean,
): boolean {
  if (currentValue == null || targetValue == null) return false;
  return lowerIsBetter ? currentValue <= targetValue : currentValue >= targetValue;
}

export async function recordGoalAchievement(params: {
  goalId: string;
  periodKey: string;
  source: 'auto' | 'manual';
  value?: number | null;
  targetValue?: number | null;
  activityId?: string | null;
  achievedAt?: Date;
}): Promise<void> {
  await prisma.goalAchievement.upsert({
    where: {
      goalId_periodKey: {
        goalId: params.goalId,
        periodKey: params.periodKey,
      },
    },
    create: {
      goalId: params.goalId,
      periodKey: params.periodKey,
      source: params.source,
      value: params.value ?? undefined,
      targetValue: params.targetValue ?? undefined,
      activityId: params.activityId ?? undefined,
      achievedAt: params.achievedAt ?? new Date(),
    },
    update: {},
  });
}

async function syncAchievementForGoal(
  goal: Goal,
  config: GoalMetricConfig,
  currentValue: number | null,
  activities: ActivityRow[],
  ref = new Date(),
): Promise<void> {
  if (!isReached(currentValue, goal.targetValue, goal.lowerIsBetter)) return;
  if (isGoalExpired(goal.targetDate, ref)) return;

  if (config.template === 'performance') {
    const endMode = inferPerformanceEndMode(config, goal.targetDate);
    if (endMode === 'on_date' && isGoalExpired(goal.targetDate, ref)) return;

    const existing = await prisma.goalAchievement.findUnique({
      where: {
        goalId_periodKey: { goalId: goal.id, periodKey: PERFORMANCE_PERIOD_KEY },
      },
    });
    if (existing) return;

    const best = computePerformanceBest(activities, config.sport, config.distanceM);
    await recordGoalAchievement({
      goalId: goal.id,
      periodKey: PERFORMANCE_PERIOD_KEY,
      source: 'auto',
      value: best?.seconds ?? currentValue,
      targetValue: goal.targetValue,
      activityId: best?.activityId ?? null,
    });
    await prisma.goal.update({
      where: { id: goal.id },
      data: { achieved: true, currentValue },
    });
    return;
  }

  const periodKey = buildPeriodKey(config.period, ref);
  const existing = await prisma.goalAchievement.findUnique({
    where: { goalId_periodKey: { goalId: goal.id, periodKey } },
  });
  if (existing) return;

  await recordGoalAchievement({
    goalId: goal.id,
    periodKey,
    source: 'auto',
    value: currentValue,
    targetValue: goal.targetValue,
  });
}

export async function recordManualGoalAchievement(goal: Goal): Promise<void> {
  const config = parseGoalMetricConfig(goal.metricKey);
  const periodKey =
    config?.template === 'period'
      ? buildPeriodKey(config.period, new Date())
      : PERFORMANCE_PERIOD_KEY;

  await recordGoalAchievement({
    goalId: goal.id,
    periodKey,
    source: 'manual',
    value: goal.currentValue,
    targetValue: goal.targetValue,
  });
}

export async function getRecentGoalAchievements(limit = 20) {
  return prisma.goalAchievement.findMany({
    take: limit,
    orderBy: { achievedAt: 'desc' },
    include: {
      goal: { select: { id: true, title: true, unit: true, metricKey: true, kind: true } },
      activity: {
        select: { id: true, title: true, type: true, date: true },
      },
    },
  });
}

export async function getGoalAchievementsForActivity(activityId: string) {
  return prisma.goalAchievement.findMany({
    where: { activityId },
    orderBy: { achievedAt: 'desc' },
    include: {
      goal: { select: { id: true, title: true, unit: true, metricKey: true, targetValue: true } },
    },
  });
}

export async function getLatestAchievementForGoal(goalId: string) {
  return prisma.goalAchievement.findFirst({
    where: { goalId },
    orderBy: { achievedAt: 'desc' },
    include: {
      activity: { select: { id: true, title: true, date: true } },
    },
  });
}

export async function enrichGoalsWithProgress<T extends Goal>(
  goals: T[],
): Promise<
  (T & {
    currentValue: number | null;
    achieved: boolean;
    validatingActivityId: string | null;
    lastAchievedAt: Date | null;
  })[]
> {
  const hasPerformance = goals.some((g) => {
    const cfg = parseGoalMetricConfig(g.metricKey);
    return cfg?.template === 'performance';
  });

  const [periodActivities, performanceActivities] = await Promise.all([
    loadActivitiesForGoals(),
    hasPerformance ? loadAllActivitiesForPerformance() : Promise.resolve([] as ActivityRow[]),
  ]);

  const ref = new Date();
  const enriched: (T & {
    currentValue: number | null;
    achieved: boolean;
    validatingActivityId: string | null;
    lastAchievedAt: Date | null;
  })[] = [];

  for (const goal of goals) {
    const config = parseGoalMetricConfig(goal.metricKey);
    if (!config || goal.kind !== 'METRIC') {
      enriched.push({
        ...goal,
        validatingActivityId: null,
        lastAchievedAt: null,
      });
      continue;
    }

    const expired = isGoalExpired(goal.targetDate, ref);
    const activities = config.template === 'performance' ? performanceActivities : periodActivities;
    const currentValue = expired
      ? goal.currentValue
      : computeMetricCurrentValue(config, activities, ref);

    if (!expired) {
      await syncAchievementForGoal(goal, config, currentValue, activities, ref);
    }

    const latest = await getLatestAchievementForGoal(goal.id);
    const refreshed = await prisma.goal.findUnique({ where: { id: goal.id } });

    enriched.push({
      ...goal,
      currentValue,
      achieved: refreshed?.achieved ?? goal.achieved,
      validatingActivityId: latest?.activityId ?? null,
      lastAchievedAt: latest?.achievedAt ?? null,
    });
  }

  return enriched;
}
