import type { ActivityType } from '@prisma/client';
import { differenceInCalendarDays, format, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ActivityForAnalytics, PmcPoint } from '@/lib/analytics';
import { computePmcSeries } from '@/lib/analytics';
import {
  formatActivityWeatherNarrative,
  parseActivityWeather,
} from '@/lib/activity/activity-weather';
import { categoryLabels, sideLabels, statusLabels } from '@/lib/physical';
import { computeTrainingLoad } from '@/lib/training-load';

const SLEEP_TARGET_MIN = 390; // 6h30 — seuil récupération (cf. alerts.ts)

export type NarrativeHealthRow = {
  date: Date;
  sleepMinutes: number | null;
  hrv: number | null;
  restingHr: number | null;
  recoveryScore: number | null;
  readinessLevel: string | null;
  hrvStatus: string | null;
  bodyBattery: number | null;
};

export type NarrativePhysicalNote = {
  id: string;
  category: keyof typeof categoryLabels;
  title: string;
  bodyPart: string | null;
  side: keyof typeof sideLabels;
  severity: number | null;
  status: keyof typeof statusLabels;
  description: string | null;
  affectsTraining: boolean;
  checkins: { severity: number | null; date: Date }[];
};

export type NarrativeAthleteProfile = {
  ftpW: number | null;
  lthr: number | null;
  maxHr: number | null;
  runThresholdPaceSecPerKm: number | null;
};

export type NarrativeActivityMetrics = {
  type: ActivityType;
  duration: number | null;
  load: number | null;
  runMetrics: {
    paceSecPerKm: number | null;
    avgHr: number | null;
    avgPower: number | null;
  } | null;
  bikeMetrics: {
    avgPower: number | null;
    normalizedPower: number | null;
    intensityFactor: number | null;
  } | null;
  weather: string | null;
};

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function fmtPace(secPerKm?: number | null): string | null {
  if (secPerKm == null || secPerKm <= 0) return null;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${s.toString().padStart(2, '0')}/km`;
}

function fmtSleep(minutes: number | null): string | null {
  if (minutes == null) return null;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

function pctDelta(actual: number, reference: number): number {
  return Math.round(((actual - reference) / reference) * 100);
}

export function buildRecoveryContextFacts(
  activityDate: Date,
  healthRows: NarrativeHealthRow[],
): string[] {
  const activityDay = startOfDay(activityDate);
  const beforeActivity = healthRows.filter((row) => startOfDay(row.date) < activityDay);
  if (!beforeActivity.length) {
    return ['Pas de données santé/sommeil sur les 14 jours précédant la séance.'];
  }

  const lines: string[] = [];
  const dayBefore = beforeActivity.find(
    (row) => differenceInCalendarDays(activityDay, startOfDay(row.date)) === 1,
  );

  if (dayBefore) {
    const bits = [
      dayBefore.sleepMinutes != null ? `sommeil ${fmtSleep(dayBefore.sleepMinutes)}` : null,
      dayBefore.hrv != null ? `HRV ${Math.round(dayBefore.hrv)} ms` : null,
      dayBefore.restingHr != null ? `FC repos ${Math.round(dayBefore.restingHr)} bpm` : null,
      dayBefore.recoveryScore != null
        ? `readiness ${Math.round(dayBefore.recoveryScore)}/100`
        : null,
      dayBefore.bodyBattery != null ? `body battery ${Math.round(dayBefore.bodyBattery)}` : null,
    ].filter(Boolean);
    if (bits.length) {
      lines.push(
        `Veille de séance (${format(dayBefore.date, 'EEE d MMM', { locale: fr })}) : ${bits.join(', ')}.`,
      );
    }
  } else {
    lines.push('Pas de données santé la veille de la séance.');
  }

  const last7 = beforeActivity.slice(0, 7);
  const avgSleep = avg(last7.map((row) => row.sleepMinutes).filter((v): v is number => v != null));
  const avgHrv = avg(last7.map((row) => row.hrv).filter((v): v is number => v != null));
  const avgReadiness = avg(
    last7.map((row) => row.recoveryScore).filter((v): v is number => v != null),
  );
  const avgRhr = avg(last7.map((row) => row.restingHr).filter((v): v is number => v != null));

  const trendBits = [
    avgSleep != null ? `sommeil moy. 7j ${fmtSleep(Math.round(avgSleep))}` : null,
    avgHrv != null ? `HRV moy. 7j ${Math.round(avgHrv)} ms` : null,
    avgReadiness != null ? `readiness moy. 7j ${Math.round(avgReadiness)}/100` : null,
    avgRhr != null ? `FC repos moy. 7j ${Math.round(avgRhr)} bpm` : null,
  ].filter(Boolean);
  if (trendBits.length) {
    lines.push(`Tendance 7 jours avant séance : ${trendBits.join(', ')}.`);
  }

  if (avgSleep != null) {
    const debtMin = SLEEP_TARGET_MIN - avgSleep;
    if (debtMin > 15) {
      lines.push(
        `Dette de sommeil probable : moyenne ${fmtSleep(Math.round(avgSleep))}/nuit sur 7j, soit ~${Math.round(debtMin)} min/nuit sous la cible récupération (${fmtSleep(SLEEP_TARGET_MIN)}).`,
      );
    } else if (debtMin < -15) {
      lines.push(
        `Sommeil récent au-dessus de la cible récupération (${fmtSleep(SLEEP_TARGET_MIN)}/nuit en moyenne sur 7j).`,
      );
    }
  }

  const recent3 = beforeActivity.slice(0, 3);
  const prior7 = beforeActivity.slice(3, 10);
  const readinessRecent = avg(
    recent3.map((row) => row.recoveryScore).filter((v): v is number => v != null),
  );
  const readinessPrior = avg(
    prior7.map((row) => row.recoveryScore).filter((v): v is number => v != null),
  );
  if (readinessRecent != null && readinessPrior != null) {
    const diff = Math.round(readinessRecent - readinessPrior);
    if (Math.abs(diff) >= 5) {
      lines.push(
        diff < 0
          ? `Readiness en baisse récente : ${Math.round(readinessRecent)}/100 (3 derniers jours) vs ${Math.round(readinessPrior)}/100 (fenêtre précédente).`
          : `Readiness en hausse récente : ${Math.round(readinessRecent)}/100 (3 derniers jours) vs ${Math.round(readinessPrior)}/100 (fenêtre précédente).`,
      );
    }
  }

  const hrvRecent = avg(recent3.map((row) => row.hrv).filter((v): v is number => v != null));
  const hrvPrior = avg(prior7.map((row) => row.hrv).filter((v): v is number => v != null));
  if (hrvRecent != null && hrvPrior != null) {
    const diff = Math.round(hrvRecent - hrvPrior);
    if (Math.abs(diff) >= 3) {
      lines.push(
        diff < 0
          ? `HRV en baisse sur les 3 derniers jours (${Math.round(hrvRecent)} ms vs ${Math.round(hrvPrior)} ms avant).`
          : `HRV en hausse sur les 3 derniers jours (${Math.round(hrvRecent)} ms vs ${Math.round(hrvPrior)} ms avant).`,
      );
    }
  }

  return lines;
}

export function buildTrainingLoadFacts(
  activityDate: Date,
  activities: { date: Date; load: number | null }[],
): string[] {
  const upToSession = activities.filter((a) => a.date <= activityDate);
  if (!upToSession.length) return ['Pas assez d’historique pour estimer la charge d’entraînement.'];

  const load = computeTrainingLoad(upToSession, activityDate);
  const lines = [
    `Charge 7 jours glissants (au jour de la séance) : ${load.weeklyLoad} TSS.`,
    `ACWR au jour de la séance : ${load.acwr} (fatigue estimée : ${load.fatigue}).`,
  ];

  if (load.loadMonotony != null) {
    lines.push(`Monotonie de charge 7j : ${load.loadMonotony}.`);
  }

  const recentSessions = upToSession
    .filter((a) => a.date < activityDate && (a.load ?? 0) > 0)
    .slice(0, 5);
  if (recentSessions.length) {
    lines.push(
      'Séances chargées récentes (avant celle-ci) : ' +
        recentSessions
          .map((a) => {
            const days = differenceInCalendarDays(startOfDay(activityDate), startOfDay(a.date));
            return `J-${days} · ${Math.round(a.load ?? 0)} TSS`;
          })
          .join(' ; ') +
        '.',
    );
  }

  return lines;
}

export function buildPmcFacts(activityDate: Date, activities: ActivityForAnalytics[]): string[] {
  const upToSession = activities.filter((a) => a.date <= activityDate);
  const series = computePmcSeries(upToSession, 90);
  if (!series.length) return [];

  const activityDayId = format(startOfDay(activityDate), 'yyyy-MM-dd');
  const point =
    [...series].reverse().find((p) => p.date <= activityDayId) ?? series[series.length - 1];
  if (!point) return [];

  return [
    `Forme (PMC au jour de la séance) : CTL ${Math.round(point.ctl)}, ATL ${Math.round(point.atl)}, TSB ${Math.round(point.tsb)}.`,
    interpretTsb(point),
  ];
}

function interpretTsb(point: PmcPoint): string {
  if (point.tsb >= 15)
    return 'TSB positif marqué : fraîcheur relative possible (affûtage ou sous-charge récente).';
  if (point.tsb >= 0)
    return 'TSB légèrement positif : équilibre charge/récupération globalement favorable.';
  if (point.tsb >= -20)
    return 'TSB légèrement négatif : fatigue d’entraînement normale en phase de charge.';
  return 'TSB très négatif : fatigue accumulée importante à croiser avec sommeil/récupération/conditions physiques.';
}

export function buildThresholdPerformanceFacts(
  activity: NarrativeActivityMetrics,
  profile: NarrativeAthleteProfile | null,
): string[] {
  if (!profile) return ['Seuils personnels non renseignés dans le profil.'];

  const lines: string[] = [];
  const seuils = [
    profile.ftpW != null ? `FTP ${profile.ftpW} W` : null,
    profile.lthr != null ? `LTHR ${profile.lthr} bpm` : null,
    profile.maxHr != null ? `FC max ${profile.maxHr} bpm` : null,
    fmtPace(profile.runThresholdPaceSecPerKm)
      ? `allure seuil ${fmtPace(profile.runThresholdPaceSecPerKm)}`
      : null,
  ].filter(Boolean);
  if (seuils.length) lines.push(`Seuils personnels : ${seuils.join(', ')}.`);

  if (activity.type === 'RUN' && activity.runMetrics) {
    const { paceSecPerKm, avgHr } = activity.runMetrics;
    if (profile.runThresholdPaceSecPerKm && paceSecPerKm) {
      const delta = pctDelta(paceSecPerKm, profile.runThresholdPaceSecPerKm);
      if (delta > 0) {
        lines.push(
          `Allure séance ${fmtPace(paceSecPerKm)} : ~${delta}% plus lente que l’allure seuil personnelle.`,
        );
      } else if (delta < -2) {
        lines.push(
          `Allure séance ${fmtPace(paceSecPerKm)} : ~${Math.abs(delta)}% plus rapide que l’allure seuil personnelle.`,
        );
      } else {
        lines.push(
          `Allure séance ${fmtPace(paceSecPerKm)} : proche de l’allure seuil personnelle.`,
        );
      }
    }
    if (profile.lthr && avgHr) {
      const pct = Math.round((avgHr / profile.lthr) * 100);
      lines.push(`FC moyenne ${Math.round(avgHr)} bpm = ${pct}% LTHR.`);
    }
  }

  if (activity.type === 'BIKE' && activity.bikeMetrics) {
    const { avgPower, normalizedPower, intensityFactor } = activity.bikeMetrics;
    if (profile.ftpW && normalizedPower) {
      const ifVal = intensityFactor ?? normalizedPower / profile.ftpW;
      lines.push(
        `Puissance normalisée ${Math.round(normalizedPower)} W (IF ~${ifVal.toFixed(2)} vs FTP ${profile.ftpW} W).`,
      );
    } else if (profile.ftpW && avgPower) {
      lines.push(
        `Puissance moyenne ${Math.round(avgPower)} W (~${Math.round((avgPower / profile.ftpW) * 100)}% FTP).`,
      );
    }
  } else if (activity.runMetrics?.avgHr && profile.maxHr && !profile.lthr) {
    lines.push(
      `FC moyenne ${Math.round(activity.runMetrics.avgHr)} bpm (~${Math.round((activity.runMetrics.avgHr / profile.maxHr) * 100)}% FC max).`,
    );
  }

  return lines;
}

export function buildPhysicalConditionFacts(notes: NarrativePhysicalNote[]): string[] {
  const active = notes.filter((note) => note.affectsTraining && note.status !== 'RESOLVED');
  if (!active.length) {
    return ['Aucune condition physique active signalée (douleur, posture, mobilité).'];
  }

  return active.map((note) => {
    const trend =
      note.checkins.length >= 2
        ? (() => {
            const last = note.checkins[0]?.severity;
            const prev = note.checkins[1]?.severity;
            if (last == null || prev == null) return null;
            if (last < prev) return 'tendance amélioration';
            if (last > prev) return 'tendance aggravation';
            return 'tendance stable';
          })()
        : null;

    const bits = [
      `${categoryLabels[note.category]} · ${note.title}`,
      note.bodyPart
        ? `zone ${note.bodyPart}${note.side !== 'NA' ? ` (${sideLabels[note.side]})` : ''}`
        : null,
      note.severity != null ? `sévérité ${note.severity}/10` : null,
      `statut ${statusLabels[note.status]}`,
      trend,
      note.description ? `note : ${note.description}` : null,
    ].filter(Boolean);
    return `- ${bits.join(' · ')}`;
  });
}

export function buildEnvironmentFacts(
  weather: string | null,
  environmentLines: string[],
): string[] {
  const lines: string[] = [];
  const parsed = parseActivityWeather(weather);
  if (parsed) {
    lines.push(`Conditions observées : ${formatActivityWeatherNarrative(parsed)}.`);
  } else if (weather?.trim()) {
    lines.push(`Conditions observées : ${weather.trim()}.`);
  }

  for (const line of environmentLines) {
    if (line.trim()) lines.push(line.trim());
  }

  return lines.length
    ? lines
    : ['Pas de données environnementales exploitables pour cette séance.'];
}
