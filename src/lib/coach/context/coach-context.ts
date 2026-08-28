import { differenceInCalendarDays, format, startOfDay, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  getActivePhysicalNotes,
  getActivitiesForCoach,
  getAthleteProfile,
  getGoals,
  getHealthEntries,
  getPlannedSessionsForCoach,
} from '@/lib/queries';
import { loadAthletePmcAnchor, loadDailyTrainingStressEntries } from '@/lib/training/pmc-server';
import { pmcTsb } from '@/lib/training/pmc';
import { categoryLabels, sideLabels, statusLabels } from '@/lib/physical';
import { getOrBuildAthleteSnapshot } from '@/lib/athlete-state/snapshot-service';
import { prisma } from '@/lib/prisma';
import { listTravelContexts } from '@/lib/travel-context/service';
import { toUtcDateOnly } from '@/lib/travel-context/calendar-date';
import { travelTrainingConstraintLabel } from '@/lib/travel-context/training-constraint';
import { travelDisciplineLabels } from '@/lib/travel-context/disciplines';
import { buildTopActionLine } from '@/lib/today/today-rich-view';
import { decisionVerdict } from '@/lib/decision/projection';
import { resolve, resolveCode } from '@/lib/french';
import { computeTrainingLoad } from '@/lib/training/training-load';
import { buildEnvironmentPresentationContext } from '@/lib/presentation/environment';
import {
  formatScenarioComparisonForCoach,
  loadScenarioComparisonForCoach,
} from '@/lib/presentation/scenario-comparison';
import { formatEquipmentForCoach } from '@/lib/equipment/format';
import { normalizeAthleteEquipment } from '@/lib/equipment/parse';
import { dayKeyFromDate, toLocalCalendarDate } from '@/lib/date/day-key';

async function loadNutritionSummary(
  athleteId: string,
  trainingDayId: string,
): Promise<{ calories: number; protein: number; carbs: number; fat: number } | null> {
  try {
    const row = await prisma.dailyNutrition.findFirst({
      where: { athleteId, date: new Date(`${trainingDayId}T00:00:00Z`) },
    });
    if (!row) {
      return null;
    }
    return {
      calories: row.calories,
      protein: Math.round(row.protein),
      carbs: Math.round(row.carbohydrates),
      fat: Math.round(row.fat),
    };
  } catch {
    return null;
  }
}

const WEEKDAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const TYPE_FR: Record<string, string> = {
  RUN: 'Course',
  BIKE: 'Vélo',
  SWIM: 'Natation',
  STRENGTH: 'Renfo',
};

/** Latest home/today weather observation for coach — cheap indexed read, never Open-Meteo. */
async function loadHomeWeatherHint(
  athleteId: string,
  trainingDayId: string,
): Promise<{
  airTemperatureC: number | null;
  relativeHumidityPct: number | null;
} | null> {
  const row = await prisma.environmentalObservationRecord.findFirst({
    where: {
      athleteId,
      trainingDayId,
      dimension: 'WEATHER',
      supersededBy: null,
    },
    orderBy: { observedAt: 'desc' },
    select: { payload: true },
  });
  if (!row?.payload || typeof row.payload !== 'object') {
    return null;
  }
  const payload = row.payload as Record<string, unknown>;
  const airTemperatureC =
    typeof payload.airTemperatureC === 'number' ? payload.airTemperatureC : null;
  const relativeHumidityPct =
    typeof payload.relativeHumidityPct === 'number' ? payload.relativeHumidityPct : null;
  if (airTemperatureC === null && relativeHumidityPct === null) {
    return null;
  }
  return { airTemperatureC, relativeHumidityPct };
}

function formatPace(secPerKm?: number | null): string | null {
  if (secPerKm === null || secPerKm <= 0) {
    return null;
  }
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}/km`;
}

function formatMin(seconds?: number | null): string {
  if (!seconds) {
    return '—';
  }
  return `${Math.round(seconds / 60)} min`;
}

type CoachContextData = Awaited<ReturnType<typeof buildCoachContextUncached>>;

export type BuildCoachContextOptions = {
  /**
   * Load Scenario Engine comparison into the prompt.
   * Use for plan / adapt (horizon decisions). Skip for chat (tool on demand).
   */
  includeScenario?: boolean;
};

/**
 * Cache mémoire très court du contexte coach. Plusieurs endpoints IA (plan,
 * briefing, adaptation, rétro hebdo) peuvent être déclenchés à quelques secondes
 * d'intervalle : on évite alors de refaire les 7 requêtes DB. Le TTL court fait
 * que toute donnée modifiée est reprise quasi immédiatement (app mono-utilisateur).
 */
const CONTEXT_TTL_MS = 30_000;
let contextCache: {
  key: string;
  at: number;
  value: CoachContextData;
} | null = null;

/** Invalide le cache (à appeler après une mutation impactant le contexte). */
export function invalidateCoachContext() {
  contextCache = null;
}

export async function buildCoachContext(
  athleteId: string,
  refDate: Date = new Date(),
  options?: BuildCoachContextOptions,
): Promise<CoachContextData> {
  const includeScenario = options?.includeScenario === true;
  const key = `${athleteId}:${format(startOfDay(refDate), 'yyyy-MM-dd')}:sc${includeScenario ? 1 : 0}`;
  const now = Date.now();
  if (contextCache && contextCache.key === key && now - contextCache.at < CONTEXT_TTL_MS) {
    return contextCache.value;
  }
  const value = await buildCoachContextUncached(athleteId, refDate, { includeScenario });
  contextCache = { key, at: now, value };
  return value;
}

function relativeActivityDay(activityDate: Date, today: Date): string | null {
  const diff = differenceInCalendarDays(today, startOfDay(activityDate));
  if (diff === 0) {
    return "aujourd'hui";
  }
  if (diff === 1) {
    return 'hier';
  }
  return null;
}

type CoachActivity = Awaited<ReturnType<typeof getActivitiesForCoach>>[number];

function appendRunDetailParts(a: CoachActivity, parts: string[]): void {
  if (!a.runMetrics) {
    return;
  }
  if (a.runMetrics.distanceM) {
    parts.push(`${(a.runMetrics.distanceM / 1000).toFixed(1)} km`);
  }
  const pace = formatPace(a.runMetrics.paceSecPerKm);
  if (pace) {
    parts.push(pace);
  }
  if (a.runMetrics.avgHr) {
    parts.push(`${a.runMetrics.avgHr} bpm`);
  }
}

function appendBikeDetailParts(a: CoachActivity, parts: string[]): void {
  if (!a.bikeMetrics) {
    return;
  }
  if (a.bikeMetrics.avgPower) {
    parts.push(`${Math.round(a.bikeMetrics.avgPower)} W`);
  }
  if (a.bikeMetrics.normalizedPower) {
    parts.push(`NP ${Math.round(a.bikeMetrics.normalizedPower)}`);
  }
  if (a.bikeMetrics.tss) {
    parts.push(`TSS ${Math.round(a.bikeMetrics.tss)}`);
  }
}

function appendStrengthDetailParts(a: CoachActivity, parts: string[]): void {
  if (a.type !== 'STRENGTH' || !a.strengthSets.length) {
    return;
  }
  const exos = a.strengthSets
    .slice(0, 5)
    .map((s) => {
      const w = s.weightKg !== null ? ` ${s.weightKg}kg` : '';
      return `${s.exercise} ${s.sets}x${s.reps}${w}`;
    })
    .join(', ');
  parts.push(exos);
}

function activityDetailParts(a: CoachActivity): string[] {
  const parts: string[] = [];
  appendRunDetailParts(a, parts);
  appendBikeDetailParts(a, parts);
  if (a.swimMetrics?.distanceM) {
    parts.push(`${a.swimMetrics.distanceM} m`);
  }
  appendStrengthDetailParts(a, parts);
  return parts;
}

function mapActivityForCoachRecent(a: CoachActivity, today: Date) {
  return {
    date: format(a.date, 'EEE d MMM', { locale: fr }),
    relativeDay: relativeActivityDay(a.date, today),
    type: TYPE_FR[a.type] ?? a.type,
    title: a.title ?? '',
    duration: formatMin(a.duration),
    load: a.load !== null ? Math.round(a.load) : null,
    rpe: a.rpe,
    feeling: a.feeling ?? null,
    detail: activityDetailParts(a).join(' · '),
  };
}

/**
 * Construit un résumé compact et structuré de l'état de l'athlète, destiné à
 * être injecté dans le prompt du Coach IA. On garde un volume de tokens faible
 * (synthèse, pas de données brutes) → coût minimal et meilleures réponses.
 */
function averageNumeric(vals: (number | null | undefined)[]): number | null {
  const ok = vals.filter((v): v is number => v !== null && v !== undefined);
  return ok.length ? Math.round(ok.reduce((s, v) => s + v, 0) / ok.length) : null;
}

function buildHealthAverages(
  last7: Awaited<ReturnType<typeof getHealthEntries>>,
): Pick<
  CoachContextData['health'],
  'avgSleepMin' | 'avgHrv' | 'avgRestingHr' | 'avgReadiness'
> {
  return {
    avgSleepMin: averageNumeric(last7.map((h) => h.sleepMinutes)),
    avgHrv: averageNumeric(last7.map((h) => h.hrv)),
    avgRestingHr: averageNumeric(last7.map((h) => h.restingHr)),
    avgReadiness: averageNumeric(last7.map((h) => h.recoveryScore)),
  };
}

function buildTodayReadinessFields(
  todayHealth: Awaited<ReturnType<typeof getHealthEntries>>[number] | undefined,
): Pick<CoachContextData['health'], 'readinessToday' | 'readinessLevel'> {
  return {
    readinessToday: todayHealth?.recoveryScore ?? null,
    readinessLevel: todayHealth?.readinessLevel ?? null,
  };
}

function buildTodayAutonomicFields(
  todayHealth: Awaited<ReturnType<typeof getHealthEntries>>[number] | undefined,
): Pick<CoachContextData['health'], 'hrvStatus' | 'bodyBattery'> {
  return {
    hrvStatus: todayHealth?.hrvStatus ?? null,
    bodyBattery: todayHealth?.bodyBattery ?? null,
  };
}

function buildTodayHealthFields(
  todayHealth: Awaited<ReturnType<typeof getHealthEntries>>[number] | undefined,
): Pick<
  CoachContextData['health'],
  'readinessToday' | 'readinessLevel' | 'hrvStatus' | 'bodyBattery'
> {
  return {
    ...buildTodayReadinessFields(todayHealth),
    ...buildTodayAutonomicFields(todayHealth),
  };
}

function buildHealthFromEntries(
  healthEntries: Awaited<ReturnType<typeof getHealthEntries>>,
): CoachContextData['health'] {
  const last7 = healthEntries.slice(0, 7);
  return {
    ...buildTodayHealthFields(healthEntries[0]),
    ...buildHealthAverages(last7),
  };
}

function buildGoalsContext(
  goals: Awaited<ReturnType<typeof getGoals>>,
  today: Date,
): Pick<CoachContextData, 'primaryRace' | 'races' | 'metricGoals'> {
  const activeGoals = goals.filter((g) => !g.achieved);
  const races = activeGoals
    .filter((g) => g.kind === 'RACE' && g.targetDate)
    .map((g) => ({
      title: g.title,
      date: g.targetDate!,
      location: g.location,
      priority: g.priority,
      raceFormat: g.raceFormat,
      targetPerformance: g.targetPerformance,
      daysToGo: differenceInCalendarDays(new Date(g.targetDate!), today),
    }))
    .filter((g) => g.daysToGo >= 0)
    .sort((a, b) => a.daysToGo - b.daysToGo);
  return {
    primaryRace: races.find((r) => r.priority === 'A') ?? races[0] ?? null,
    races,
    metricGoals: activeGoals
      .filter((g) => g.kind === 'METRIC')
      .map((g) => ({
        title: g.title,
        current: g.currentValue,
        target: g.targetValue,
        unit: g.unit,
      })),
  };
}

const CONDITION_TYPE_LABELS: Record<string, string> = {
  PAIN: 'Douleur',
  INJURY: 'Blessure',
  MOBILITY_LIMITATION: 'Mobilité',
  POSTURE_ISSUE: 'Posture',
  DISCOMFORT: 'Gêne',
  MUSCULAR_TIGHTNESS: 'Raideur musculaire',
  JOINT_STIFFNESS: 'Raideur articulaire',
  INSTABILITY: 'Instabilité',
  RECURRING_PHYSICAL: 'Récidive',
  OTHER: 'Autre',
};

const TREND_LABELS: Record<string, string> = {
  IMPROVING: 'en amélioration',
  WORSENING: 'en aggravation',
  STABLE: 'stable',
};

function legacyPhysicalTrend(
  checkins: Awaited<ReturnType<typeof getActivePhysicalNotes>>[number]['checkins'],
): string | null {
  if (checkins.length < 2) {
    return null;
  }
  const last = checkins[0]?.severity;
  const prev = checkins[1]?.severity;
  if (last === null || prev === null) {
    return null;
  }
  if (last < prev) {
    return 'en amélioration';
  }
  if (last > prev) {
    return 'en aggravation';
  }
  return 'stable';
}

function buildPhysicalContext(
  athleteSnapshot: Awaited<ReturnType<typeof getOrBuildAthleteSnapshot>>,
  physicalNotes: Awaited<ReturnType<typeof getActivePhysicalNotes>>,
): CoachContextData['physical'] {
  const physicalFromSnapshot =
    athleteSnapshot.physicalHealth?.conditions
      .filter((c) => c.affectsTraining && c.status !== 'RESOLVED')
      .map((c) => ({
        category: CONDITION_TYPE_LABELS[c.type] ?? c.type,
        status: c.status,
        title: c.label,
        bodyPart: c.bodyRegion,
        side: c.side !== 'NA' ? sideLabels[c.side] : null,
        severity: c.severity,
        description: null as string | null,
        trend: TREND_LABELS[c.trend] ?? null,
        functionalCapacity: c.functionalCapacity,
        confidence: c.confidence,
        source: 'inferred' as const,
      })) ?? [];

  if (physicalFromSnapshot.length > 0) {
    return physicalFromSnapshot;
  }

  return physicalNotes.map((n) => ({
    category: categoryLabels[n.category],
    status: statusLabels[n.status],
    title: n.title,
    bodyPart: n.bodyPart,
    side: n.side !== 'NA' ? sideLabels[n.side] : null,
    severity: n.severity,
    description: n.description,
    trend: legacyPhysicalTrend(n.checkins),
    functionalCapacity: null as string | null,
    confidence: null as number | null,
    source: 'legacy' as const,
  }));
}

function buildTravelMemory(
  travelContexts: Awaited<ReturnType<typeof listTravelContexts>>,
  refDate: Date,
): Pick<CoachContextData, 'travel' | 'constraints'> {
  const utcToday = toUtcDateOnly(refDate);
  const utcPlanHorizon = subDays(utcToday, -21);
  const memoryEntriesInWindow = travelContexts.filter(
    (t) => t.startDate <= utcPlanHorizon && t.endDate >= utcToday,
  );
  const mapEntry = (t: (typeof memoryEntriesInWindow)[number]) => ({
    label: t.label,
    locationLabel: t.locationLabel,
    startDate: t.startDate.toISOString().slice(0, 10),
    endDate: t.endDate.toISOString().slice(0, 10),
    isActiveNow: t.startDate <= utcToday && t.endDate >= utcToday,
    note: t.note,
    trainingConstraint: t.trainingConstraint,
    allowedDisciplines: t.allowedDisciplines,
  });
  return {
    travel: memoryEntriesInWindow.filter((t) => t.type === 'TRAVEL').map(mapEntry),
    constraints: memoryEntriesInWindow.filter((t) => t.type === 'CONSTRAINT').map(mapEntry),
  };
}

function buildCoachDecision(
  athleteSnapshot: Awaited<ReturnType<typeof getOrBuildAthleteSnapshot>>,
): CoachContextData['decision'] {
  const decisionRaw = athleteSnapshot.decision;
  if (!decisionRaw) {
    return null;
  }
  return {
    verdict: decisionVerdict(decisionRaw),
    headline: decisionRaw.primaryDecision.headlineCode
      ? resolveCode(decisionRaw.primaryDecision.headlineCode)
      : null,
    topAction: buildTopActionLine(decisionRaw.topAction),
    rationale: decisionRaw.topAction?.rationaleCode
      ? resolveCode(decisionRaw.topAction.rationaleCode)
      : null,
    limitingFactorDomain: decisionRaw.limitingFactor.domain,
    limitingFactorDescription: decisionRaw.limitingFactor.description
      ? resolve(decisionRaw.limitingFactor.description)
      : null,
    confidence: decisionRaw.confidence,
    confidenceTier: decisionRaw.confidenceTier,
    attentionDomain: decisionRaw.priority.attentionDomain,
    physiologicalConsistency: decisionRaw.physiologicalConsistency,
    consistencyScore: decisionRaw.consistencyScore,
    criticalEvidence: decisionRaw.supportingEvidence.find((e) => e.severity === 'CRITICAL'),
    primaryConflict: decisionRaw.conflicts[0] ?? null,
    primaryOpportunity: decisionRaw.opportunities[0] ?? null,
    adviceActionable: athleteSnapshot.adviceActionable,
    prescriptiveAdviceAllowed: athleteSnapshot.todaysDecision !== null,
  };
}

function buildCoachFatigueSnapshot(
  athleteSnapshot: Awaited<ReturnType<typeof getOrBuildAthleteSnapshot>>,
): CoachContextData['fatigue'] {
  const fatigueSnapshot = athleteSnapshot.fatigue;
  if (!fatigueSnapshot) {
    return null;
  }
  return {
    fatigueIndex: fatigueSnapshot.fatigueIndex ?? null,
    fatigueLevel: fatigueSnapshot.fatigueLevel,
    trainingCapacity: fatigueSnapshot.trainingCapacity,
    trajectory: fatigueSnapshot.trajectory,
    primaryLimitingFactor: fatigueSnapshot.primaryLimitingFactor ?? null,
    functionalOverreachingRisk: fatigueSnapshot.signals.functionalOverreachingRisk,
    estimatedTimeToFresh: fatigueSnapshot.estimatedTimeToFresh ?? null,
    performanceImpairmentEstimate: fatigueSnapshot.performanceImpairmentEstimate,
    confidence: fatigueSnapshot.confidence,
  };
}

function buildCoachAdaptationSnapshot(
  athleteSnapshot: Awaited<ReturnType<typeof getOrBuildAthleteSnapshot>>,
): CoachContextData['adaptation'] {
  const adaptationSnapshot = athleteSnapshot.adaptation;
  if (!adaptationSnapshot) {
    return null;
  }
  return {
    adaptationIndex: adaptationSnapshot.adaptationIndex ?? null,
    adaptationStatus: adaptationSnapshot.adaptationStatus,
    adaptationTrend: adaptationSnapshot.adaptationTrend,
    limitingFactor: adaptationSnapshot.limitingFactor ?? null,
    estimatedAdaptationPeak: adaptationSnapshot.estimatedAdaptationPeak ?? null,
    plateauRisk: adaptationSnapshot.plateauRisk,
    overreachingWithoutAdaptationDetected:
      adaptationSnapshot.overreachingWithoutAdaptationDetected,
    confidence: adaptationSnapshot.confidence,
  };
}

function buildCoachIntelligence(
  athleteSnapshot: Awaited<ReturnType<typeof getOrBuildAthleteSnapshot>>,
): Pick<CoachContextData, 'fatigue' | 'adaptation' | 'decision'> {
  return {
    fatigue: buildCoachFatigueSnapshot(athleteSnapshot),
    adaptation: buildCoachAdaptationSnapshot(athleteSnapshot),
    decision: buildCoachDecision(athleteSnapshot),
  };
}

function resolveCoachHomeLabel(
  profile: Awaited<ReturnType<typeof getAthleteProfile>>,
): string | null {
  return profile?.homeLocationLabel?.trim() || (profile?.homeLocationLat !== null ? 'Domicile' : null);
}

function environmentAdjustmentFields(
  athleteSnapshot: Awaited<ReturnType<typeof getOrBuildAthleteSnapshot>>,
): Pick<CoachContextData['environment'], 'recoveryDemandAdjustment' | 'performanceAdjustment'> {
  return {
    recoveryDemandAdjustment: athleteSnapshot.environment?.recoveryDemandAdjustment ?? null,
    performanceAdjustment: athleteSnapshot.environment?.performanceAdjustment ?? null,
  };
}

function buildCoachEnvironment(
  profile: Awaited<ReturnType<typeof getAthleteProfile>>,
  athleteSnapshot: Awaited<ReturnType<typeof getOrBuildAthleteSnapshot>>,
  homeWeather: Awaited<ReturnType<typeof loadHomeWeatherHint>>,
): CoachContextData['environment'] {
  const envPresentation = buildEnvironmentPresentationContext(athleteSnapshot.environment);
  return {
    homeLabel: resolveCoachHomeLabel(profile),
    thermalLabel: envPresentation.thermalLabel,
    summaryLine: envPresentation.summaryLine,
    detailLine: envPresentation.detailLine,
    trainingImpact: envPresentation.trainingImpact,
    airTemperatureC: homeWeather?.airTemperatureC ?? null,
    relativeHumidityPct: homeWeather?.relativeHumidityPct ?? null,
    ...environmentAdjustmentFields(athleteSnapshot),
  };
}

function buildAvailableDays(
  activities: Awaited<ReturnType<typeof getActivitiesForCoach>>,
  today: Date,
): string[] {
  const since = subDays(today, 56);
  const dayCounts = new Array(7).fill(0);
  for (const activity of activities) {
    if (activity.date >= since) {
      dayCounts[new Date(activity.date).getDay()] += 1;
    }
  }
  return dayCounts
    .map((count, day) => ({ day, count }))
    .filter((entry) => entry.count >= 8 * 0.25)
    .map((entry) => WEEKDAYS_FR[entry.day]);
}

function mapRealizedSession(
  planned: Awaited<ReturnType<typeof getPlannedSessionsForCoach>>[number],
) {
  const analysis = planned.analysis as {
    complianceScore?: number;
    verdict?: string;
    summary?: string;
  };
  return {
    date: format(toLocalCalendarDate(planned.date), 'EEE d MMM', { locale: fr }),
    type: TYPE_FR[planned.type] ?? planned.type,
    title: planned.title ?? '',
    score: analysis.complianceScore ?? null,
    verdict: analysis.verdict ?? null,
    summary: analysis.summary ?? null,
  };
}

function mapUpcomingPlanned(
  planned: Awaited<ReturnType<typeof getPlannedSessionsForCoach>>[number],
) {
  return {
    id: planned.id,
    date: format(toLocalCalendarDate(planned.date), 'EEE d MMM', { locale: fr }),
    dateIso: dayKeyFromDate(planned.date),
    type: TYPE_FR[planned.type] ?? planned.type,
    title: planned.title ?? '',
    intensity: planned.intensity,
    durationMin: planned.durationMin,
    startTime: planned.startTime ?? null,
    locationLabel: planned.locationLabel ?? null,
  };
}

function buildCoachProfile(
  profile: Awaited<ReturnType<typeof getAthleteProfile>>,
): CoachContextData['profile'] {
  if (!profile) {
    return null;
  }
  return {
    ftpW: profile.ftpW,
    maxHr: profile.maxHr,
    lthr: profile.lthr,
    thresholdPace: formatPace(profile.runThresholdPaceSecPerKm),
    vo2maxRunning: profile.vo2maxRunning,
    vo2maxCycling: profile.vo2maxCycling,
  };
}

function buildFitnessContext(
  anchor: Awaited<ReturnType<typeof loadAthletePmcAnchor>>,
  dailyStress: Awaited<ReturnType<typeof loadDailyTrainingStressEntries>>,
  refDate: Date,
): Pick<CoachContextData, 'fitness' | 'load'> {
  const fitness = anchor
    ? { ctl: Math.round(anchor.ctl), atl: Math.round(anchor.atl), tsb: Math.round(pmcTsb(anchor)) }
    : { ctl: 0, atl: 0, tsb: 0 };
  return { fitness, load: computeTrainingLoad(dailyStress, refDate) };
}

type LoadCoachContextSourcesInput = {
  athleteId: string;
  today: Date;
  trainingDayId: string;
  includeScenario: boolean;
};

async function loadCoachContextSources(input: LoadCoachContextSourcesInput) {
  const { athleteId, today, trainingDayId, includeScenario } = input;
  return Promise.all([
    getActivitiesForCoach(athleteId, { limit: 120, sinceDays: 90 }),
    getHealthEntries(athleteId, 30),
    getGoals(athleteId),
    getPlannedSessionsForCoach(athleteId, { from: today, to: subDays(today, -21) }),
    getPlannedSessionsForCoach(athleteId, { from: subDays(today, 14), to: today }),
    getAthleteProfile(athleteId),
    getActivePhysicalNotes(athleteId),
    getOrBuildAthleteSnapshot(athleteId, trainingDayId),
    listTravelContexts(prisma, athleteId),
    loadHomeWeatherHint(athleteId, trainingDayId),
    includeScenario
      ? loadScenarioComparisonForCoach(athleteId, { horizonDays: 7 })
      : Promise.resolve(null),
    loadAthletePmcAnchor(athleteId, { refDate: today }),
    loadDailyTrainingStressEntries(athleteId, { refDate: today }),
    loadNutritionSummary(athleteId, trainingDayId),
  ] as const);
}

async function buildCoachContextUncached(
  athleteId: string,
  refDate: Date = new Date(),
  options?: BuildCoachContextOptions,
) {
  const includeScenario = options?.includeScenario === true;
  const today = startOfDay(refDate);
  const trainingDayId = format(today, 'yyyy-MM-dd');

  const [
    activities,
    healthEntries,
    goals,
    planned,
    pastPlanned,
    profile,
    physicalNotes,
    athleteSnapshot,
    travelContexts,
    homeWeather,
    scenarioComparison,
    anchor,
    dailyStress,
    nutritionToday,
  ] = await loadCoachContextSources({ athleteId, today, trainingDayId, includeScenario });

  const { fitness, load } = buildFitnessContext(anchor, dailyStress, refDate);

  const availableDays = buildAvailableDays(activities, today);
  const recent = activities.slice(0, 14).map((a) => mapActivityForCoachRecent(a, today));
  const realizedSessions = pastPlanned
    .filter((p) => p.completed && p.analysis)
    .map(mapRealizedSession);
  const health = buildHealthFromEntries(healthEntries);
  const { primaryRace, races, metricGoals } = buildGoalsContext(goals, today);
  const upcomingPlanned = planned.map(mapUpcomingPlanned);
  const environment = buildCoachEnvironment(profile, athleteSnapshot, homeWeather);
  const physical = buildPhysicalContext(athleteSnapshot, physicalNotes);
  const { travel, constraints } = buildTravelMemory(travelContexts, refDate);
  const { fatigue, adaptation, decision } = buildCoachIntelligence(athleteSnapshot);

  return {
    today: format(today, 'EEEE d MMMM yyyy', { locale: fr }),
    note: profile?.context?.trim() || null,
    equipment: normalizeAthleteEquipment(profile?.equipment ?? null),
    profile: buildCoachProfile(profile),
    fitness,
    load,
    availableDays,
    health,
    primaryRace,
    races,
    metricGoals,
    recent,
    realizedSessions,
    upcomingPlanned,
    travel,
    constraints,
    physical,
    fatigue,
    adaptation,
    decision,
    environment,
    scenarioComparison: formatScenarioComparisonForCoach(scenarioComparison),
    nutrition: nutritionToday,
  };
}

export type CoachContext = Awaited<ReturnType<typeof buildCoachContext>>;

const VERDICT_FR: Record<string, string> = {
  TRAIN_HARD: 'Entraîne-toi fort',
  TRAIN_SMART: 'Entraîne-toi malin',
  TRAIN_EASY: 'Entraîne-toi doucement',
  RECOVER: 'Récupère',
  RACE_READY: 'Pic de forme',
  CAUTION: 'Prudence (conflits détectés)',
};

const CONSISTENCY_FR: Record<string, string> = {
  ALIGNED: 'Alignés',
  PARTIALLY_ALIGNED: 'Partiellement alignés',
  CONFLICTING: 'En conflit',
};

/**
 * Renders the canonical Decision Engine block for the Coach prompt.
 *
 * `prescriptiveAdviceAllowed` reuses the exact gate Today uses to decide whether to
 * show `todaysDecision` (see `applyTruthfulnessOverlay` in `snapshot-truthfulness.ts`).
 * When it's false, the verdict/headline/top-action are withheld and the LLM is told
 * explicitly not to prescribe an action — Coach must never contradict Today by
 * discussing a decision Today itself is currently declining to show. Factual
 * observations (limiting factor, model consistency, conflicts, opportunities) are
 * still surfaced either way — only the prescriptive framing is gated.
 */
function formatPrescriptiveDecisionLines(d: NonNullable<CoachContext['decision']>): string[] {
  if (!d.prescriptiveAdviceAllowed) {
    return [
      "Hors fenêtre de conseil actionnable pour aujourd'hui (même règle que Today, qui n'affiche plus de décision à ce moment de la journée) : NE PRESCRIS AUCUNE action et NE MENTIONNE PAS le verdict précis. Tu peux discuter des observations factuelles ci-dessous (facteur limitant, cohérence inter-modèles, historique) si l'athlète pose une question, mais formule-les comme des observations, jamais comme une instruction d'entraînement.",
    ];
  }
  const lines: string[] = [
    `Verdict : ${VERDICT_FR[d.verdict] ?? d.verdict} · confiance ${Math.round((d.confidence ?? 0) * 100)}% (${d.confidenceTier ?? '—'}).`,
  ];
  if (d.headline) {
    lines.push(`Message : ${d.headline}.`);
  }
  if (d.topAction) {
    lines.push(`Action prioritaire : ${d.topAction}${d.rationale ? `. ${d.rationale}` : ''}.`);
  }
  return lines;
}

function appendDecisionEvidenceLines(
  d: NonNullable<CoachContext['decision']>,
  lines: string[],
): void {
  if (d.criticalEvidence) {
    lines.push(`⚠ CRITIQUE : ${resolve(d.criticalEvidence.title)}.`);
  }
  if (d.primaryConflict) {
    lines.push(
      `Conflit résolu (${d.primaryConflict.type.replace(/_/g, ' ').toLowerCase()}) : ${resolveCode(d.primaryConflict.descriptionCode)}.`,
    );
  }
  if (d.primaryOpportunity) {
    lines.push(
      `Opportunité : ${resolve(d.primaryOpportunity.title)} (${d.primaryOpportunity.timeWindow.toLowerCase().replace('_', ' ')}).`,
    );
  }
  if (!d.adviceActionable) {
    lines.push(
      `⚠ Conseil entraînement non actionnable (confiance ou données insuffisantes) — reste prudent et factuel.`,
    );
  }
}

function formatDecisionObservationLines(d: NonNullable<CoachContext['decision']>): string[] {
  const lines: string[] = [];
  if (d.limitingFactorDescription) {
    lines.push(
      `Facteur limitant : ${d.limitingFactorDomain ?? '—'} — ${d.limitingFactorDescription}.`,
    );
  }
  if (d.physiologicalConsistency) {
    lines.push(
      `Cohérence inter-modèles : ${CONSISTENCY_FR[d.physiologicalConsistency] ?? d.physiologicalConsistency} (score ${d.consistencyScore ?? '—'}/100).`,
    );
  }
  appendDecisionEvidenceLines(d, lines);
  return lines;
}

export function formatDecisionSection(decision: CoachContext['decision']): string[] {
  if (!decision || decision.verdict === 'INSUFFICIENT_DATA') {
    return [];
  }

  return [
    `\n## Décision SHARPIT du jour (canonique — à expliquer, ne pas contredire)`,
    ...formatPrescriptiveDecisionLines(decision),
    ...formatDecisionObservationLines(decision),
  ];
}

/**
 * Renders temporary, non-travel training-capacity constraints (illness, injury,
 * high work-stress week, etc.) — same trainingConstraint/allowedDisciplines logic
 * as the travel block, without the location/logistics dimension.
 */
function formatConstraintEntry(c: CoachContext['constraints'][number]): string {
  const label = c.label?.trim() || 'Contrainte';
  const constraintLabel =
    travelTrainingConstraintLabel(c.trainingConstraint)?.toLowerCase() ?? 'entraînement normal';
  const sports =
    c.allowedDisciplines.length > 0
      ? ` · sports : ${travelDisciplineLabels(c.allowedDisciplines).join(', ')}`
      : '';
  return `- ${label} : ${c.startDate} → ${c.endDate}${c.isActiveNow ? ' [en cours]' : ' [à venir]'} · contrainte ${c.trainingConstraint} (${constraintLabel})${sports}${c.note ? ` — ${c.note}` : ''}`;
}

export function formatConstraintsSection(constraints: CoachContext['constraints']): string[] {
  if (constraints.length === 0) {
    return [];
  }

  return [
    '\n## Contraintes temporaires',
    "IMPÉRATIF : pour toute séance dont la date tombe dans une de ces périodes, respecte la capacité d'entraînement réduite — ce n'est PAS un déplacement, ne change ni le lieu ni la logistique, seulement le volume/l'intensité proposés.",
    'Contrainte d’entraînement (FULL / REDUCED / MOBILITY_ONLY / NONE) : MOBILITY_ONLY = mobilité/étirements uniquement ; NONE = pas de séance structurée ; REDUCED = volume/intensité réduits.',
    ...constraints.map(formatConstraintEntry),
  ];
}

const FATIGUE_LEVEL_FR: Record<string, string> = {
  FRESH: 'Frais (0-20)',
  FUNCTIONAL_LOW: 'Fatigue normale (21-40)',
  FUNCTIONAL_HIGH: 'Charge productive (41-60)',
  ACCUMULATED: 'Fatigue accumulée (61-75)',
  NON_FUNCTIONAL_RISK: 'Risque surcharge (76-88)',
  OVERREACHING_RISK: 'Surentraînement (89-100)',
};

const TRAINING_CAPACITY_FR: Record<string, string> = {
  FULL: 'totale',
  REDUCED: 'réduite (éviter haute intensité)',
  LIGHT_ONLY: "légère uniquement (Z1-Z2, pas d'intervalles)",
  REST_ONLY: 'repos uniquement',
};

function profileThresholdParts(profile: NonNullable<CoachContext['profile']>): string[] {
  return [
    profile.ftpW !== null ? `FTP ${profile.ftpW} W` : null,
    profile.lthr !== null ? `LTHR ${profile.lthr} bpm` : null,
    profile.maxHr !== null ? `FC max ${profile.maxHr} bpm` : null,
    profile.thresholdPace ? `Allure seuil ${profile.thresholdPace}` : null,
    profile.vo2maxRunning !== null ? `VO2max course ${profile.vo2maxRunning}` : null,
    profile.vo2maxCycling !== null ? `VO2max vélo ${profile.vo2maxCycling}` : null,
  ].filter(Boolean) as string[];
}

function formatProfileThresholdLines(profile: CoachContext['profile']): string[] {
  if (!profile) {
    return ['Seuils physiologiques : non renseignés (estimations à utiliser).'];
  }
  const seuils = profileThresholdParts(profile);
  return seuils.length ? [`Seuils physiologiques : ${seuils.join(', ')}.`] : [];
}

function appendFatigueWarningLines(fatigue: NonNullable<CoachContext['fatigue']>, lines: string[]): void {
  if (fatigue.primaryLimitingFactor) {
    lines.push(`Facteur limitant principal : ${fatigue.primaryLimitingFactor}.`);
  }
  if (fatigue.functionalOverreachingRisk && fatigue.functionalOverreachingRisk !== 'LOW') {
    lines.push(
      `⚠ Risque de surentraînement fonctionnel : ${fatigue.functionalOverreachingRisk}. Priorise la récupération avant d'augmenter la charge.`,
    );
  }
  if (fatigue.estimatedTimeToFresh !== null && fatigue.fatigueLevel !== 'FRESH') {
    lines.push(`Retour à l'état frais estimé dans ${fatigue.estimatedTimeToFresh} jour(s).`);
  }
  if (fatigue.performanceImpairmentEstimate && fatigue.performanceImpairmentEstimate > 0.1) {
    lines.push(
      `Capacité de performance estimée à ~${Math.round((1 - fatigue.performanceImpairmentEstimate) * 100)}% du maximum.`,
    );
  }
}

const ADAPTATION_STATUS_FR: Record<string, string> = {
  POSITIVELY_ADAPTING: 'Adaptation positive',
  MAINTAINING: 'Maintien',
  PLATEAUING: 'Plateau',
  MALADAPTING: 'Maladaptation',
  DETRAINING: 'Désentraînement',
};

const ADAPTATION_TREND_FR: Record<string, string> = {
  IMPROVING: 'En progression',
  STABLE: 'Stable',
  DECLINING: 'En déclin',
};

function fatigueSummaryBits(fatigue: NonNullable<CoachContext['fatigue']>): string[] {
  return [
    fatigue.fatigueIndex !== null ? `Index ${fatigue.fatigueIndex}/100` : null,
    fatigue.fatigueLevel ? (FATIGUE_LEVEL_FR[fatigue.fatigueLevel] ?? fatigue.fatigueLevel) : null,
    fatigue.trainingCapacity
      ? `Capacité d'entraînement ${TRAINING_CAPACITY_FR[fatigue.trainingCapacity] ?? fatigue.trainingCapacity}`
      : null,
    fatigue.trajectory ? `Tendance : ${fatigue.trajectory}` : null,
  ].filter(Boolean) as string[];
}

function formatFatigueSection(fatigue: CoachContext['fatigue']): string[] {
  if (!fatigue?.fatigueLevel || fatigue.fatigueLevel === 'INSUFFICIENT_DATA') {
    return [];
  }
  const lines = [
    `\n## Fatigue Intelligence (modèle multi-dimensionnel SHARPIT)\n${fatigueSummaryBits(fatigue).join(' · ')}.`,
  ];
  appendFatigueWarningLines(fatigue, lines);
  return lines;
}

function appendAdaptationWarningLines(
  adaptation: NonNullable<CoachContext['adaptation']>,
  lines: string[],
): void {
  if (adaptation.limitingFactor) {
    lines.push(`Facteur limitant domaine : ${adaptation.limitingFactor}.`);
  }
  if (adaptation.overreachingWithoutAdaptationDetected) {
    lines.push(
      `⚠ Surentraînement sans adaptation détecté : charge élevée sans réponse autonomique. Réduire immédiatement.`,
    );
  }
  if (adaptation.plateauRisk) {
    lines.push(
      `⚠ Risque de plateau : ≥ 14 jours sans progression d'adaptation. Un changement de stimulus est nécessaire.`,
    );
  }
  if (adaptation.estimatedAdaptationPeak !== null) {
    lines.push(`Pic de forme estimé dans ${adaptation.estimatedAdaptationPeak} jour(s).`);
  }
}

function adaptationSummaryBits(adaptation: NonNullable<CoachContext['adaptation']>): string[] {
  return [
    adaptation.adaptationIndex !== null ? `Index ${adaptation.adaptationIndex}/100` : null,
    adaptation.adaptationStatus
      ? (ADAPTATION_STATUS_FR[adaptation.adaptationStatus] ?? adaptation.adaptationStatus)
      : null,
    adaptation.adaptationTrend
      ? (ADAPTATION_TREND_FR[adaptation.adaptationTrend] ?? adaptation.adaptationTrend)
      : null,
  ].filter(Boolean) as string[];
}

function formatAdaptationSection(adaptation: CoachContext['adaptation']): string[] {
  if (!adaptation?.adaptationStatus || adaptation.adaptationStatus === 'INSUFFICIENT_DATA') {
    return [];
  }
  const lines = [
    `\n## Adaptation Intelligence (modèle multi-dimensionnel SHARPIT)\n${adaptationSummaryBits(adaptation).join(' · ')}.`,
  ];
  appendAdaptationWarningLines(adaptation, lines);
  return lines;
}

function environmentSummaryBits(environment: CoachContext['environment']): string[] {
  return [
    environment.homeLabel ? `lieu ${environment.homeLabel}` : null,
    environment.airTemperatureC !== null ? `${Math.round(environment.airTemperatureC)} °C` : null,
    environment.relativeHumidityPct !== null
      ? `humidité ${Math.round(environment.relativeHumidityPct)} %`
      : null,
    environment.thermalLabel,
  ].filter(Boolean) as string[];
}

function appendEnvironmentAdjustmentLines(
  environment: CoachContext['environment'],
  lines: string[],
): void {
  if (environment.recoveryDemandAdjustment !== null && environment.recoveryDemandAdjustment !== 0) {
    lines.push(
      `Ajustement récupération lié à l'environnement : ${environment.recoveryDemandAdjustment > 0 ? '+' : ''}${Math.round(environment.recoveryDemandAdjustment * 100)} %.`,
    );
  }
  if (environment.performanceAdjustment !== null && environment.performanceAdjustment !== 0) {
    lines.push(
      `Ajustement performance attendu : ${environment.performanceAdjustment > 0 ? '+' : ''}${Math.round(environment.performanceAdjustment * 100)} %.`,
    );
  }
}

function formatEnvironmentSection(environment: CoachContext['environment']): string[] {
  const bits = environmentSummaryBits(environment);
  if (!bits.length && !environment.summaryLine && !environment.detailLine) {
    return [];
  }
  const lines = ['\n## Environnement du jour'];
  if (bits.length) {
    lines.push(`${bits.join(' · ')}.`);
  }
  if (environment.summaryLine) {
    lines.push(environment.summaryLine);
  }
  if (environment.detailLine) {
    lines.push(environment.detailLine);
  }
  appendEnvironmentAdjustmentLines(environment, lines);
  return lines;
}

function healthSummaryBits(health: CoachContext['health']): string[] {
  return [
    health.readinessToday !== null ? `Readiness du jour ${health.readinessToday}/100` : null,
    health.readinessLevel ? `(${health.readinessLevel})` : null,
    health.hrvStatus ? `HRV ${health.hrvStatus}` : null,
    health.bodyBattery !== null ? `Body Battery ${health.bodyBattery}` : null,
    health.avgSleepMin !== null
      ? `sommeil moy 7j ${Math.floor(health.avgSleepMin / 60)}h${(health.avgSleepMin % 60).toString().padStart(2, '0')}`
      : null,
    health.avgRestingHr !== null ? `FC repos moy ${health.avgRestingHr}` : null,
    health.avgHrv !== null ? `HRV moy ${health.avgHrv}` : null,
  ].filter(Boolean) as string[];
}

function formatHealthSection(health: CoachContext['health']): string[] {
  const healthBits = healthSummaryBits(health);
  return healthBits.length ? [`\n## Récupération\n${healthBits.join(' · ')}.`] : [];
}

function formatPrimaryRaceLine(primaryRace: NonNullable<CoachContext['primaryRace']>): string {
  const extras = [
    primaryRace.priority ? `priorité ${primaryRace.priority}` : null,
    primaryRace.raceFormat,
    primaryRace.targetPerformance ? `objectif visé : ${primaryRace.targetPerformance}` : null,
  ].filter(Boolean);
  return `Course principale : ${primaryRace.title}${primaryRace.location ? ` (${primaryRace.location})` : ''} dans ${primaryRace.daysToGo} jours (~${Math.round(primaryRace.daysToGo / 7)} semaines)${extras.length ? ` — ${extras.join(', ')}` : ''}.`;
}

function formatMetricGoalLine(goal: CoachContext['metricGoals'][number]): string {
  if (goal.target === null) {
    return `Objectif métrique : ${goal.title}.`;
  }
  const current = goal.current !== null ? ` (actuel ${goal.current})` : '';
  return `Objectif métrique : ${goal.title} → cible ${goal.target}${goal.unit ?? ''}${current}.`;
}

function formatGoalsSection(ctx: CoachContext): string[] {
  const lines = ['\n## Objectifs'];
  if (ctx.primaryRace) {
    lines.push(formatPrimaryRaceLine(ctx.primaryRace));
  } else {
    lines.push('Pas de course planifiée.');
  }
  for (const race of ctx.races.filter((entry) => entry !== ctx.primaryRace)) {
    const extras = [
      race.priority ? `prio ${race.priority}` : null,
      race.targetPerformance ? `objectif : ${race.targetPerformance}` : null,
    ].filter(Boolean);
    lines.push(
      `Autre course : ${race.title} dans ${race.daysToGo} j${extras.length ? ` (${extras.join(', ')})` : ''}.`,
    );
  }
  lines.push(...ctx.metricGoals.map(formatMetricGoalLine));
  return lines;
}

function formatRecentActivityLine(a: CoachContext['recent'][number]): string {
  const extra = [
    a.load !== null ? `charge ${a.load}` : null,
    a.rpe !== null ? `RPE ${a.rpe}` : null,
    a.feeling ? `ressenti ${a.feeling}` : null,
    a.detail || null,
  ]
    .filter(Boolean)
    .join(' · ');
  return `- ${a.date}${a.relativeDay ? ` (${a.relativeDay})` : ''} · ${a.type} ${a.title} (${a.duration})${extra ? ` — ${extra}` : ''}`;
}

function formatRecentActivitiesSection(recent: CoachContext['recent']): string[] {
  if (!recent.length) {
    return [];
  }
  return ['\n## Séances récentes (14 dernières)', ...recent.map(formatRecentActivityLine)];
}

function formatPhysicalSection(physical: CoachContext['physical']): string[] {
  if (!physical.length) {
    return [];
  }
  return [
    '\n## Condition physique à respecter (douleurs / blessures / mobilité / posture)',
    "IMPÉRATIF : NE CONFONDS PAS les catégories, car elles n'impliquent PAS la même adaptation :",
    "- Douleur / Blessure : ne charge pas la zone concernée, réduis ou supprime l'intensité, voire annule la séance si la sévérité est élevée. C'est une contrainte forte.",
    "- Mobilité / Posture : ce N'EST PAS une douleur — n'allège pas l'endurance ni l'intensité pour ça. Propose plutôt du travail ciblé (mobilité, gainage, renforcement correctif) en complément, sans réduire la charge des séances clés.",
    "Tiens compte de la sévérité, de la tendance (amélioration/aggravation) et de la capacité fonctionnelle (symptôme ≠ capacité d'entraînement) pour doser.",
    'Les estimations SHARPIT sont des aides à la décision — jamais un diagnostic médical.',
    ...physical.map((p) => {
      const bits = [
        `${p.category} : ${p.title}`,
        p.bodyPart ? `zone ${p.bodyPart}${p.side ? ` (${p.side})` : ''}` : null,
        p.severity !== null ? `sévérité inférée ${p.severity}/10` : null,
        `statut ${p.status}`,
        p.trend ? `tendance ${p.trend}` : null,
        p.functionalCapacity ? `capacité fonctionnelle ${p.functionalCapacity}` : null,
        p.confidence !== null ? `confiance ${Math.round(p.confidence * 100)}%` : null,
        p.description || null,
      ]
        .filter(Boolean)
        .join(' · ');
      return `- ${bits}`;
    }),
  ];
}

function formatTravelSection(travel: CoachContext['travel']): string[] {
  if (!travel.length) {
    return [];
  }
  return [
    '\n## Déplacements / voyages',
    "IMPÉRATIF : pour toute séance dont la date tombe dans une période de déplacement, adapte le lieu (météo, altitude, chaleur attendue) et la logistique — ne propose pas une séance nécessitant du matériel resté au domicile (ex. home trainer, piscine spécifique) si l'athlète est en déplacement.",
    'Respecte aussi la contrainte d’entraînement du voyage (FULL / REDUCED / MOBILITY_ONLY / NONE) : MOBILITY_ONLY = mobilité/étirements uniquement ; NONE = pas de séance structurée ; REDUCED = volume/intensité réduits.',
    ...travel.map((t) => {
      const label = t.label?.trim() || t.locationLabel;
      const constraintLabel =
        travelTrainingConstraintLabel(t.trainingConstraint)?.toLowerCase() ?? 'entraînement normal';
      const sports =
        t.allowedDisciplines.length > 0
          ? ` · sports : ${travelDisciplineLabels(t.allowedDisciplines).join(', ')}`
          : '';
      return `- ${label} (${t.locationLabel}) : ${t.startDate} → ${t.endDate}${t.isActiveNow ? ' [en cours]' : ' [à venir]'} · contrainte ${t.trainingConstraint} (${constraintLabel})${sports}${t.note ? ` — ${t.note}` : ''}`;
    }),
  ];
}

function formatPersonalNoteSection(note: string | null): string[] {
  if (!note) {
    return [];
  }
  return [
    "\n## Contexte personnel (défini par l'athlète — priorité haute)",
    'Prends impérativement en compte ces contraintes/préférences pour la pertinence des propositions (dispos, charge de travail, jours propices aux grosses séances, etc.) :',
    note,
  ];
}

function formatPmcSection(ctx: CoachContext): string[] {
  return [
    `\n## État de forme (PMC)\nForme/Fitness CTL ${ctx.fitness.ctl} · Fatigue ATL ${ctx.fitness.atl} · Fraîcheur TSB ${ctx.fitness.tsb}.`,
    `Charge 7j : ${ctx.load.weeklyLoad} · ratio aigu/chronique ${ctx.load.acwr} · fatigue ${ctx.load.fatigue}.`,
    'Interprétation TSB : >5 frais, -10..5 neutre, <-10 fatigué, <-30 surcharge.',
  ];
}

function formatAvailabilitySection(availableDays: string[]): string[] {
  return availableDays.length
    ? [`\n## Disponibilités\nJours d'entraînement habituels : ${availableDays.join(', ')}.`]
    : [];
}

function formatRealizedSessionsSection(
  realizedSessions: CoachContext['realizedSessions'],
): string[] {
  if (!realizedSessions.length) {
    return [];
  }
  return [
    '\n## Exécution des séances prévues récentes (prévu vs réalisé)',
    ...realizedSessions.map(
      (r) =>
        `- ${r.date} · ${r.type} ${r.title} → conformité ${r.score ?? '?'}/100${r.verdict ? ` (${r.verdict})` : ''}${r.summary ? ` — ${r.summary}` : ''}`,
    ),
  ];
}

function formatUpcomingPlannedSection(
  upcomingPlanned: CoachContext['upcomingPlanned'],
): string[] {
  if (!upcomingPlanned.length) {
    return [];
  }
  return [
    '\n## Déjà planifié (ne pas dupliquer — utiliser les id ci-dessous)',
    ...upcomingPlanned.map((p) => {
      const extras = [
        p.startTime ? `à ${p.startTime}` : null,
        p.intensity ? `[${p.intensity}]` : null,
        p.durationMin ? `${p.durationMin} min` : null,
        p.locationLabel ? `@ ${p.locationLabel}` : null,
      ]
        .filter(Boolean)
        .join(' ');
      return `- id=${p.id} · ${p.dateIso} (${p.date}) · ${p.type} ${p.title}${extras ? ` ${extras}` : ''}`;
    }),
  ];
}

function collectCoachContextLines(ctx: CoachContext): string[] {
  return [
    `# Profil athlète — ${ctx.today}`,
    ...formatPersonalNoteSection(ctx.note),
    ...formatProfileThresholdLines(ctx.profile),
    `\n${formatEquipmentForCoach(ctx.equipment)}`,
    ...formatPmcSection(ctx),
    ...formatFatigueSection(ctx.fatigue),
    ...formatAdaptationSection(ctx.adaptation),
    ...formatDecisionSection(ctx.decision),
    ...formatEnvironmentSection(ctx.environment),
    ...formatHealthSection(ctx.health),
    ...formatAvailabilitySection(ctx.availableDays),
    ...formatGoalsSection(ctx),
    ...formatRecentActivitiesSection(ctx.recent),
    ...formatRealizedSessionsSection(ctx.realizedSessions),
    ...formatPhysicalSection(ctx.physical),
    ...formatTravelSection(ctx.travel),
    ...formatConstraintsSection(ctx.constraints),
    ...formatUpcomingPlannedSection(ctx.upcomingPlanned),
    ...(ctx.scenarioComparison ? [`\n${ctx.scenarioComparison}`] : []),
  ];
}

/** Rend le contexte en markdown compact pour le prompt système. */
export function formatCoachContext(ctx: CoachContext): string {
  return collectCoachContextLines(ctx).join('\n');
}
