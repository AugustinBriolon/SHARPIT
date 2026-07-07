import { ActivityType } from '@prisma/client';
import { differenceInCalendarDays, startOfDay, subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { formatDistance, formatDuration } from '@/lib/format';
import { formatGoalDisplayValue, parseGoalMetricConfig } from '@/lib/goal-metric-config';

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

function describeActivity(activity: ActivityRow): string {
  const bits = [
    `Sport : ${TYPE_FR[activity.type] ?? activity.type}`,
    activity.title ? `Titre : ${activity.title}` : null,
    `Date : ${activity.date.toISOString().slice(0, 10)}`,
    activity.duration ? `Durée : ${formatDuration(activity.duration)}` : null,
    activity.load != null ? `Charge : ${Math.round(activity.load)} TSS` : null,
    activity.rpe != null ? `RPE : ${activity.rpe}/10` : null,
    activity.feeling ? `Ressenti : ${activity.feeling}` : null,
    activity.weather ? `Météo : ${activity.weather}` : null,
    activity.notes ? `Notes : ${activity.notes}` : null,
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
    const higherPeers = peers.filter((p) => {
      const hr = avgHr(p);
      return hr != null && hr >= actHr;
    });
    const lastHigher = peers.find((p) => {
      const hr = avgHr(p);
      return hr != null && hr > actHr;
    });
    if (lastHigher) {
      const days = differenceInCalendarDays(startOfDay(activity.date), startOfDay(lastHigher.date));
      lines.push(
        `- FC moyenne la plus élevée depuis ${days} jour(s) (parmi les séances comparables récentes).`,
      );
    } else if (higherPeers.length === 0 && peers.length >= 2) {
      lines.push('- FC moyenne la plus élevée sur la fenêtre 30 jours comparée.');
    }
  }

  const peerDurations = peers.map((p) => p.duration).filter((v): v is number => v != null && v > 0);
  const avgDur = avg(peerDurations);
  if (activity.duration && avgDur) {
    const ratio = activity.duration / avgDur;
    if (ratio >= 1.15) lines.push('- Durée nettement plus longue que la moyenne habituelle.');
    else if (ratio <= 0.85) lines.push('- Durée plus courte que la moyenne habituelle.');
  }

  return lines.join('\n');
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
      narrativeAnalyzedAt: true,
      runMetrics: {
        select: { distanceM: true, paceSecPerKm: true, avgHr: true, elevationM: true },
      },
      bikeMetrics: { select: { avgPower: true, elevationM: true } },
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

  const since = subDays(startOfDay(activity.date), 30);
  const peers = await prisma.activity.findMany({
    where: {
      type: activity.type,
      date: { gte: since, lt: activity.date },
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
  });

  const healthDay = startOfDay(subDays(activity.date, 1));
  const health = await prisma.dailyHealth.findFirst({
    where: { date: healthDay },
  });

  const goalHits = await prisma.goalAchievement.findMany({
    where: { activityId: activity.id },
    include: { goal: { select: { title: true, unit: true, metricKey: true, targetValue: true } } },
  });

  const contextLines: string[] = [];
  if (health) {
    const sleepH =
      health.sleepMinutes != null ? `${(health.sleepMinutes / 60).toFixed(1)} h` : null;
    const bits = [
      sleepH ? `sommeil veille ${sleepH}` : null,
      health.hrv != null ? `HRV ${health.hrv} ms` : null,
      health.restingHr != null ? `FC repos ${health.restingHr} bpm` : null,
      health.recoveryScore != null ? `readiness ${health.recoveryScore}/100` : null,
    ].filter(Boolean);
    if (bits.length) contextLines.push(`Récupération (veille) : ${bits.join(', ')}.`);
  } else {
    contextLines.push('Récupération (veille) : pas de données santé renseignées.');
  }

  if (goalHits.length) {
    contextLines.push(
      'Objectifs validés par cette séance :\n' +
        goalHits
          .map((g) => {
            const cfg = parseGoalMetricConfig(g.goal.metricKey);
            const val = formatGoalDisplayValue(g.value, g.goal.unit, cfg);
            return `- ${g.goal.title} (${val})`;
          })
          .join('\n'),
    );
  }

  return [
    '# Cette séance',
    describeActivity(activity as ActivityRow),
    '',
    '# Comparatif historique',
    buildComparativeFacts(activity as ActivityRow, peers),
    '',
    '# Contexte athlète',
    contextLines.join('\n'),
  ].join('\n');
}
