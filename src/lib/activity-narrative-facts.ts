import { ActivityType } from '@prisma/client';
import { differenceInCalendarDays, startOfDay, subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import {
  buildEnvironmentFacts,
  buildPhysicalConditionFacts,
  buildPmcFacts,
  buildRecoveryContextFacts,
  buildThresholdPerformanceFacts,
  buildTrainingLoadFacts,
  type NarrativeActivityMetrics,
  type NarrativeAthleteProfile,
  type NarrativeHealthRow,
  type NarrativePhysicalNote,
} from '@/lib/activity-narrative-athlete-context';
import {
  formatActivityWeatherNarrative,
  parseActivityWeather,
} from '@/lib/activity/activity-weather';
import { isIndoorActivitySession } from '@/lib/activity/indoor-activity';
import { resolveActivityEnvironmentPresentation } from '@/lib/environment/activity-environment';
import { formatDistance, formatDuration } from '@/lib/format';
import { formatGoalDisplayValue, parseGoalMetricConfig } from '@/lib/goal-metric-config';
import { resolveEnvironmentalExplanation } from '@/lib/presentation/environment';
import { getActivePhysicalNotes, getAthleteProfile } from '@/lib/queries';

const TYPE_FR: Record<string, string> = {
  RUN: 'Course à pied',
  BIKE: 'Vélo',
  SWIM: 'Natation',
};

type PeerRow = {
  id: string;
  date: Date;
  duration: number | null;
  rpe: number | null;
  feeling: string | null;
  runMetrics: {
    distanceM: number | null;
    paceSecPerKm: number | null;
    avgHr: number | null;
    elevationM: number | null;
  } | null;
  bikeMetrics: { avgPower: number | null; elevationM: number | null } | null;
  swimMetrics: { distanceM: number | null; avgPaceSecPer100m: number | null } | null;
};

type ActivityRow = PeerRow & {
  type: ActivityType;
  title: string | null;
  weather: string | null;
  notes: string | null;
  load: number | null;
  observedLocationLat: number | null;
  observedLocationLng: number | null;
  observedLocationLabel: string | null;
};

function fmtPace(secPerKm?: number | null): string | null {
  if (secPerKm == null || secPerKm <= 0) return null;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}/km`;
}

function avgHr(activity: PeerRow): number | null {
  return activity.runMetrics?.avgHr ?? null;
}

function paceSecPerKm(activity: PeerRow): number | null {
  return activity.runMetrics?.paceSecPerKm ?? null;
}

function distanceM(activity: PeerRow): number | null {
  return activity.runMetrics?.distanceM ?? activity.swimMetrics?.distanceM ?? null;
}

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function weatherFact(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const parsed = parseActivityWeather(raw);
  if (parsed) return `Météo : ${formatActivityWeatherNarrative(parsed)}`;
  return `Météo : ${raw.trim()}`;
}

/** Faits séance : métriques brutes pour référence interne du modèle (ne pas tout répéter en prose). */
function describeActivity(activity: ActivityRow): string {
  const bits = [
    `Sport : ${TYPE_FR[activity.type] ?? activity.type}`,
    activity.title ? `Titre : ${activity.title}` : null,
    `Date : ${activity.date.toISOString().slice(0, 10)}`,
    activity.duration ? `Durée : ${formatDuration(activity.duration)}` : null,
    activity.load != null ? `Charge : ${Math.round(activity.load)} TSS` : null,
    activity.rpe != null ? `RPE : ${activity.rpe}/10` : null,
    activity.feeling ? `Ressenti déclaré : ${activity.feeling}` : null,
    isIndoorActivitySession(activity)
      ? 'Environnement : intérieur / virtual (pas de météo outdoor)'
      : weatherFact(activity.weather),
    activity.notes ? `Notes athlète : ${activity.notes}` : null,
  ].filter(Boolean) as string[];

  const dist = distanceM(activity);
  if (dist) bits.push(`Distance : ${formatDistance(dist)}`);
  const pace = paceSecPerKm(activity);
  if (pace) bits.push(`Allure moyenne : ${fmtPace(pace)}`);
  const hr = avgHr(activity);
  if (hr) bits.push(`FC moyenne : ${Math.round(hr)} bpm`);
  if (activity.bikeMetrics?.avgPower) {
    bits.push(`Puissance moyenne : ${Math.round(activity.bikeMetrics.avgPower)} W`);
  }
  if (activity.runMetrics?.elevationM ?? activity.bikeMetrics?.elevationM) {
    const elevation = activity.runMetrics?.elevationM ?? activity.bikeMetrics?.elevationM ?? 0;
    bits.push(`D+ : ${Math.round(elevation)} m`);
  }

  return bits.join('\n');
}

function buildComparativeFacts(activity: ActivityRow, peers: PeerRow[]): string {
  if (!peers.length) {
    return 'Comparatif 30 jours : pas assez de séances précédentes du même sport pour comparer.';
  }

  const lines: string[] = [
    `Comparatif sur ${peers.length} séance(s) du même sport dans les 30 jours précédant celle-ci :`,
  ];

  const peerPaces = peers.map(paceSecPerKm).filter((v): v is number => v != null && v > 0);
  const actPace = paceSecPerKm(activity);
  const avgPace = avg(peerPaces);
  if (actPace && avgPace) {
    const deltaPct = Math.round(((avgPace - actPace) / avgPace) * 100);
    if (deltaPct > 2) {
      lines.push(
        `- Allure plus rapide que la moyenne 30j (~${fmtPace(avgPace)}) d'environ ${deltaPct} %.`,
      );
    } else if (deltaPct < -2) {
      lines.push(
        `- Allure plus lente que la moyenne 30j (~${fmtPace(avgPace)}) d'environ ${Math.abs(deltaPct)} %.`,
      );
    } else {
      lines.push(`- Allure proche de la moyenne 30j (~${fmtPace(avgPace)}).`);
    }
  }

  const peerHrs = peers.map(avgHr).filter((v): v is number => v != null && v > 0);
  const actHr = avgHr(activity);
  const avgHr30 = avg(peerHrs);
  if (actHr && avgHr30) {
    const diff = Math.round(actHr - avgHr30);
    if (Math.abs(diff) >= 3) {
      lines.push(
        `- FC moyenne ${diff > 0 ? 'supérieure' : 'inférieure'} à la moyenne 30j (${Math.round(avgHr30)} bpm) d'environ ${Math.abs(diff)} bpm.`,
      );
    }
  }

  if (actHr) {
    const lastHigher = peers.find((p) => {
      const hr = avgHr(p);
      return hr != null && hr > actHr;
    });
    if (lastHigher) {
      const days = differenceInCalendarDays(startOfDay(activity.date), startOfDay(lastHigher.date));
      lines.push(
        `- FC moyenne la plus élevée depuis ${days} jour(s) (parmi les séances comparables récentes).`,
      );
    } else if (peers.length >= 2) {
      lines.push('- FC moyenne la plus élevée sur la fenêtre 30 jours comparée.');
    }
  }

  const peerLoads = peers.map((p) => p.duration).filter((v): v is number => v != null && v > 0);
  const avgDur = avg(peerLoads);
  if (activity.duration && avgDur) {
    const ratio = activity.duration / avgDur;
    if (ratio >= 1.15) lines.push('- Durée nettement plus longue que la moyenne habituelle.');
    else if (ratio <= 0.85) lines.push('- Durée plus courte que la moyenne habituelle.');
  }

  return lines.join('\n');
}

function mapPhysicalNotes(
  notes: Awaited<ReturnType<typeof getActivePhysicalNotes>>,
): NarrativePhysicalNote[] {
  return notes.map((note) => ({
    id: note.id,
    category: note.category,
    title: note.title,
    bodyPart: note.bodyPart,
    side: note.side,
    severity: note.severity,
    status: note.status,
    description: note.description,
    affectsTraining: note.affectsTraining,
    checkins: note.checkins.map((c) => ({ severity: c.severity, date: c.date })),
  }));
}

export async function buildActivityNarrativeFacts(activityId: string): Promise<string | null> {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      type: true,
      date: true,
      title: true,
      duration: true,
      rpe: true,
      feeling: true,
      weather: true,
      notes: true,
      load: true,
      observedLocationLat: true,
      observedLocationLng: true,
      observedLocationLabel: true,
      runMetrics: {
        select: {
          distanceM: true,
          paceSecPerKm: true,
          avgHr: true,
          elevationM: true,
          avgPower: true,
        },
      },
      bikeMetrics: {
        select: {
          avgPower: true,
          normalizedPower: true,
          intensityFactor: true,
          elevationM: true,
        },
      },
      swimMetrics: { select: { distanceM: true, avgPaceSecPer100m: true } },
    },
  });

  if (!activity) return null;
  if (
    activity.type !== ActivityType.RUN &&
    activity.type !== ActivityType.BIKE &&
    activity.type !== ActivityType.SWIM
  ) {
    return null;
  }

  const activityDay = startOfDay(activity.date);
  const since30 = subDays(activityDay, 30);

  const [
    peers,
    healthRows,
    loadHistory,
    pmcHistory,
    profile,
    physicalNotes,
    goalHits,
    environmentPresentation,
  ] = await Promise.all([
    prisma.activity.findMany({
      where: {
        type: activity.type,
        date: { gte: since30, lt: activity.date },
        id: { not: activity.id },
      },
      select: {
        id: true,
        date: true,
        duration: true,
        rpe: true,
        feeling: true,
        runMetrics: {
          select: { distanceM: true, paceSecPerKm: true, avgHr: true, elevationM: true },
        },
        bikeMetrics: { select: { avgPower: true, elevationM: true } },
        swimMetrics: { select: { distanceM: true, avgPaceSecPer100m: true } },
      },
      orderBy: { date: 'desc' },
      take: 40,
    }),
    prisma.dailyHealth.findMany({
      where: { date: { gte: subDays(activityDay, 14), lt: activityDay } },
      orderBy: { date: 'desc' },
    }),
    prisma.activity.findMany({
      where: { date: { lte: activity.date } },
      select: { date: true, load: true },
      orderBy: { date: 'desc' },
      take: 180,
    }),
    prisma.activity.findMany({
      where: { date: { lte: activity.date } },
      select: {
        date: true,
        type: true,
        duration: true,
        load: true,
        bikeMetrics: { select: { tss: true } },
      },
      orderBy: { date: 'desc' },
      take: 180,
    }),
    getAthleteProfile(),
    getActivePhysicalNotes(),
    prisma.goalAchievement.findMany({
      where: { activityId: activity.id },
      include: {
        goal: { select: { title: true, unit: true, metricKey: true, targetValue: true } },
      },
    }),
    resolveActivityEnvironmentPresentation({
      athleteId: 'default',
      activity: {
        id: activity.id,
        type: activity.type,
        date: activity.date,
        duration: activity.duration,
        weather: activity.weather,
        title: activity.title,
        notes: activity.notes,
        observedLocationLat: activity.observedLocationLat,
        observedLocationLng: activity.observedLocationLng,
        observedLocationLabel: activity.observedLocationLabel,
      },
    }).catch(() => null),
  ]);

  const healthContext: NarrativeHealthRow[] = healthRows.map((row) => ({
    date: row.date,
    sleepMinutes: row.sleepMinutes,
    hrv: row.hrv,
    restingHr: row.restingHr,
    recoveryScore: row.recoveryScore,
    readinessLevel: row.readinessLevel,
    hrvStatus: row.hrvStatus,
    bodyBattery: row.bodyBattery,
  }));

  const athleteProfile: NarrativeAthleteProfile | null = profile
    ? {
        ftpW: profile.ftpW,
        lthr: profile.lthr,
        maxHr: profile.maxHr,
        runThresholdPaceSecPerKm: profile.runThresholdPaceSecPerKm,
      }
    : null;

  const metrics: NarrativeActivityMetrics = {
    type: activity.type,
    duration: activity.duration,
    load: activity.load,
    runMetrics: activity.runMetrics,
    bikeMetrics: activity.bikeMetrics,
    weather: activity.weather,
  };

  const environmentLines: string[] = [];
  if (environmentPresentation?.visible) {
    for (const item of environmentPresentation.correction.narrative) {
      environmentLines.push(
        resolveEnvironmentalExplanation(item.code, item.params ? { ...item.params } : undefined),
      );
    }
    for (const factor of environmentPresentation.correction.factors) {
      if (factor.explanation?.trim()) environmentLines.push(factor.explanation.trim());
    }
    const effect = environmentPresentation.correction.totalAttributedEffect;
    if (effect.available && effect.value != null && effect.value > 0) {
      environmentLines.push(
        `Effet environnemental total attribué : ~${Math.round(effect.value * 100)} % sur la performance perçue.`,
      );
    }
  }

  const goalLines =
    goalHits.length > 0
      ? [
          'Objectifs validés par cette séance :',
          ...goalHits.map((g) => {
            const cfg = parseGoalMetricConfig(g.goal.metricKey);
            const val = formatGoalDisplayValue(g.value, g.goal.unit, cfg);
            return `- ${g.goal.title} (${val})`;
          }),
        ]
      : [];

  const sections = [
    '# Cette séance (données brutes — ne pas toutes répéter en prose)',
    describeActivity(activity as ActivityRow),
    '',
    '# Comparatif historique même sport (30 jours)',
    buildComparativeFacts(activity as ActivityRow, peers),
    '',
    '# Récupération & sommeil (avant la séance)',
    ...buildRecoveryContextFacts(activity.date, healthContext),
    '',
    '# Charge d’entraînement (contexte au jour de la séance)',
    ...buildTrainingLoadFacts(activity.date, loadHistory),
    ...buildPmcFacts(activity.date, pmcHistory),
    '',
    '# Seuils personnels & interprétation de la performance',
    ...buildThresholdPerformanceFacts(metrics, athleteProfile),
    '',
    '# Conditions physiques actives',
    ...buildPhysicalConditionFacts(mapPhysicalNotes(physicalNotes)),
    '',
    '# Environnement',
    ...buildEnvironmentFacts(activity.weather, environmentLines),
  ];

  if (goalLines.length) {
    sections.push('', '# Objectifs', ...goalLines);
  }

  return sections.join('\n');
}
