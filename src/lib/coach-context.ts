import { differenceInCalendarDays, format, startOfDay, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { computePmcSeries, type ActivityForAnalytics } from './analytics';
import {
  getActivePhysicalNotes,
  getActivities,
  getAthleteProfile,
  getGoals,
  getHealthEntries,
  getPlannedSessions,
} from './queries';
import { categoryLabels, sideLabels, statusLabels } from './physical';
import { computeTrainingLoad } from './training-load';
import { prisma } from './prisma';

const WEEKDAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const TYPE_FR: Record<string, string> = {
  RUN: 'Course',
  BIKE: 'Vélo',
  SWIM: 'Natation',
  STRENGTH: 'Renfo',
};

function formatPace(secPerKm?: number | null): string | null {
  if (secPerKm == null || secPerKm <= 0) return null;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}/km`;
}

function formatMin(seconds?: number | null): string {
  if (!seconds) return '—';
  return `${Math.round(seconds / 60)} min`;
}

type CoachContextData = Awaited<ReturnType<typeof buildCoachContextUncached>>;

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

export async function buildCoachContext(refDate: Date = new Date()): Promise<CoachContextData> {
  const key = format(startOfDay(refDate), 'yyyy-MM-dd');
  const now = Date.now();
  if (contextCache && contextCache.key === key && now - contextCache.at < CONTEXT_TTL_MS) {
    return contextCache.value;
  }
  const value = await buildCoachContextUncached(refDate);
  contextCache = { key, at: now, value };
  return value;
}

/**
 * Construit un résumé compact et structuré de l'état de l'athlète, destiné à
 * être injecté dans le prompt du Coach IA. On garde un volume de tokens faible
 * (synthèse, pas de données brutes) → coût minimal et meilleures réponses.
 */
async function buildCoachContextUncached(refDate: Date = new Date()) {
  const today = startOfDay(refDate);

  const [
    activities,
    healthEntries,
    goals,
    planned,
    pastPlanned,
    profile,
    physicalNotes,
    digitalTwin,
  ] = await Promise.all([
    getActivities({ limit: 120 }),
    getHealthEntries(30),
    getGoals(),
    getPlannedSessions({ from: today, to: subDays(today, -21) }),
    getPlannedSessions({ from: subDays(today, 14), to: today }),
    getAthleteProfile(),
    getActivePhysicalNotes(),
    prisma.digitalTwin
      .findUnique({
        where: { athleteId: 'default' },
        select: { fatigueState: true, adaptationState: true, reasoningState: true },
      })
      .catch(() => null),
  ]);

  // ---- Fitness (PMC : CTL / ATL / TSB) ----
  const pmcInput: ActivityForAnalytics[] = activities.map((a) => ({
    date: a.date,
    type: a.type,
    duration: a.duration,
    load: a.load,
    bikeMetrics: a.bikeMetrics ? { tss: a.bikeMetrics.tss } : null,
  }));
  const pmc = computePmcSeries(pmcInput, 90);
  const latest = pmc[pmc.length - 1];
  const fitness = latest
    ? { ctl: latest.ctl, atl: latest.atl, tsb: latest.tsb }
    : { ctl: 0, atl: 0, tsb: 0 };

  const load = computeTrainingLoad(
    activities.map((a) => ({ load: a.load, date: a.date })),
    refDate,
  );

  // ---- Disponibilités : jours d'entraînement habituels (8 dernières semaines) ----
  const since = subDays(today, 56);
  const dayCounts = new Array(7).fill(0);
  let weeksSpan = 0;
  for (const a of activities) {
    if (a.date >= since) dayCounts[new Date(a.date).getDay()] += 1;
  }
  weeksSpan = 8;
  const availableDays = dayCounts
    .map((count, day) => ({ day, count }))
    .filter((d) => d.count >= weeksSpan * 0.25) // entraîné ≥25% des semaines ce jour-là
    .map((d) => WEEKDAYS_FR[d.day]);

  // ---- Activités récentes (14 dernières) ----
  const recent = activities.slice(0, 14).map((a) => {
    const rel = (() => {
      const diff = differenceInCalendarDays(today, startOfDay(a.date));
      if (diff === 0) return "aujourd'hui";
      if (diff === 1) return 'hier';
      return null;
    })();
    const parts: string[] = [];
    if (a.runMetrics) {
      if (a.runMetrics.distanceM) parts.push(`${(a.runMetrics.distanceM / 1000).toFixed(1)} km`);
      const pace = formatPace(a.runMetrics.paceSecPerKm);
      if (pace) parts.push(pace);
      if (a.runMetrics.avgHr) parts.push(`${a.runMetrics.avgHr} bpm`);
    }
    if (a.bikeMetrics) {
      if (a.bikeMetrics.avgPower) parts.push(`${Math.round(a.bikeMetrics.avgPower)} W`);
      if (a.bikeMetrics.normalizedPower)
        parts.push(`NP ${Math.round(a.bikeMetrics.normalizedPower)}`);
      if (a.bikeMetrics.tss) parts.push(`TSS ${Math.round(a.bikeMetrics.tss)}`);
    }
    if (a.swimMetrics?.distanceM) parts.push(`${a.swimMetrics.distanceM} m`);
    if (a.type === 'STRENGTH' && a.strengthSets.length) {
      const exos = a.strengthSets
        .slice(0, 5)
        .map((s) => {
          const w = s.weightKg != null ? ` ${s.weightKg}kg` : '';
          return `${s.exercise} ${s.sets}x${s.reps}${w}`;
        })
        .join(', ');
      parts.push(exos);
    }
    return {
      date: format(a.date, 'EEE d MMM', { locale: fr }),
      relativeDay: rel,
      type: TYPE_FR[a.type] ?? a.type,
      title: a.title ?? '',
      duration: formatMin(a.duration),
      load: a.load != null ? Math.round(a.load) : null,
      rpe: a.rpe,
      feeling: a.feeling ?? null,
      detail: parts.join(' · '),
    };
  });

  // ---- Réalisation des séances prévues récentes (conformité IA) ----
  const realizedSessions = pastPlanned
    .filter((p) => p.completed && p.analysis)
    .map((p) => {
      const a = p.analysis as {
        complianceScore?: number;
        verdict?: string;
        summary?: string;
      };
      return {
        date: format(p.date, 'EEE d MMM', { locale: fr }),
        type: TYPE_FR[p.type] ?? p.type,
        title: p.title ?? '',
        score: a.complianceScore ?? null,
        verdict: a.verdict ?? null,
        summary: a.summary ?? null,
      };
    });

  // ---- Santé / récup (7 derniers jours) ----
  const last7 = healthEntries.slice(0, 7);
  const avg = (vals: (number | null | undefined)[]) => {
    const ok = vals.filter((v): v is number => v != null);
    return ok.length ? Math.round(ok.reduce((s, v) => s + v, 0) / ok.length) : null;
  };
  const [todayHealth] = healthEntries;
  const health = {
    readinessToday: todayHealth?.recoveryScore ?? null,
    readinessLevel: todayHealth?.readinessLevel ?? null,
    hrvStatus: todayHealth?.hrvStatus ?? null,
    bodyBattery: todayHealth?.bodyBattery ?? null,
    avgSleepMin: avg(last7.map((h) => h.sleepMinutes)),
    avgHrv: avg(last7.map((h) => h.hrv)),
    avgRestingHr: avg(last7.map((h) => h.restingHr)),
    avgReadiness: avg(last7.map((h) => h.recoveryScore)),
  };

  // ---- Objectifs ----
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
  // Course "principale" = priorité A la plus proche, sinon la plus proche.
  const primaryRace = races.find((r) => r.priority === 'A') ?? races[0] ?? null;

  const metricGoals = activeGoals
    .filter((g) => g.kind === 'METRIC')
    .map((g) => ({
      title: g.title,
      current: g.currentValue,
      target: g.targetValue,
      unit: g.unit,
    }));

  // ---- Déjà planifié (21 prochains jours) ----
  const upcomingPlanned = planned.map((p) => ({
    date: format(p.date, 'EEE d MMM', { locale: fr }),
    type: TYPE_FR[p.type] ?? p.type,
    title: p.title ?? '',
    intensity: p.intensity,
    durationMin: p.durationMin,
  }));

  // ---- Condition physique active (douleurs, blessures, mobilité...) ----
  const physical = physicalNotes.map((n) => {
    const trend =
      n.checkins.length >= 2
        ? (() => {
            const last = n.checkins[0]?.severity;
            const prev = n.checkins[1]?.severity;
            if (last == null || prev == null) return null;
            if (last < prev) return 'en amélioration';
            if (last > prev) return 'en aggravation';
            return 'stable';
          })()
        : null;
    return {
      category: categoryLabels[n.category],
      status: statusLabels[n.status],
      title: n.title,
      bodyPart: n.bodyPart,
      side: n.side !== 'NA' ? sideLabels[n.side] : null,
      severity: n.severity,
      description: n.description,
      trend,
    };
  });

  // ---- Fatigue Intelligence (Digital Twin) ----
  const rawFatigue = digitalTwin?.fatigueState;
  const fatigue =
    rawFatigue && typeof rawFatigue === 'object'
      ? (rawFatigue as {
          fatigueIndex?: number | null;
          fatigueLevel?: string;
          trainingCapacity?: string;
          trajectory?: string;
          primaryLimitingFactor?: string | null;
          functionalOverreachingRisk?: string;
          estimatedTimeToFresh?: number | null;
          performanceImpairmentEstimate?: number;
          confidence?: number;
        })
      : null;

  // ---- Adaptation Intelligence (Digital Twin) ----
  const rawAdaptation = digitalTwin?.adaptationState;
  const adaptation =
    rawAdaptation && typeof rawAdaptation === 'object'
      ? (rawAdaptation as {
          adaptationIndex?: number | null;
          adaptationStatus?: string;
          adaptationTrend?: string;
          limitingFactor?: string | null;
          estimatedAdaptationPeak?: number | null;
          plateauRisk?: boolean;
          overreachingWithoutAdaptationDetected?: boolean;
          confidence?: number;
          decision?: { verdict?: string; loadMultiplier?: number };
        })
      : null;

  // ---- Reasoning Engine (Digital Twin) ----
  const rawReasoning = digitalTwin?.reasoningState;
  const reasoning =
    rawReasoning && typeof rawReasoning === 'object'
      ? (rawReasoning as {
          overallVerdict?: string;
          physiologicalConsistency?: string;
          consistencyScore?: number;
          systemAttentionPriority?: string;
          limitingFactor?: { system: string | null; description: string | null };
          topAction?: { verb: string; focus: string; rationale: string } | null;
          keyFindings?: Array<{ severity: string; title: string }>;
          conflicts?: Array<{ type: string; description: string }>;
          opportunities?: Array<{ title: string; timeWindow: string }>;
          confidence?: number;
        })
      : null;

  return {
    today: format(today, 'EEEE d MMMM yyyy', { locale: fr }),
    note: profile?.context?.trim() || null,
    profile: profile
      ? {
          ftpW: profile.ftpW,
          maxHr: profile.maxHr,
          lthr: profile.lthr,
          thresholdPace: formatPace(profile.runThresholdPaceSecPerKm),
          vo2maxRunning: profile.vo2maxRunning,
          vo2maxCycling: profile.vo2maxCycling,
        }
      : null,
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
    physical,
    fatigue,
    adaptation,
    reasoning,
  };
}

export type CoachContext = Awaited<ReturnType<typeof buildCoachContext>>;

/** Rend le contexte en markdown compact pour le prompt système. */
export function formatCoachContext(ctx: CoachContext): string {
  const lines: string[] = [];
  lines.push(`# Profil athlète — ${ctx.today}`);

  // Contexte personnel défini par l'athlète — priorité haute
  if (ctx.note) {
    lines.push("\n## Contexte personnel (défini par l'athlète — priorité haute)");
    lines.push(
      'Prends impérativement en compte ces contraintes/préférences pour la pertinence des propositions (dispos, charge de travail, jours propices aux grosses séances, etc.) :',
    );
    lines.push(ctx.note);
  }

  if (ctx.profile) {
    const p = ctx.profile;
    const seuils = [
      p.ftpW != null ? `FTP ${p.ftpW} W` : null,
      p.lthr != null ? `LTHR ${p.lthr} bpm` : null,
      p.maxHr != null ? `FC max ${p.maxHr} bpm` : null,
      p.thresholdPace ? `Allure seuil ${p.thresholdPace}` : null,
      p.vo2maxRunning != null ? `VO2max course ${p.vo2maxRunning}` : null,
      p.vo2maxCycling != null ? `VO2max vélo ${p.vo2maxCycling}` : null,
    ].filter(Boolean);
    if (seuils.length) lines.push(`Seuils physiologiques : ${seuils.join(', ')}.`);
  } else {
    lines.push('Seuils physiologiques : non renseignés (estimations à utiliser).');
  }

  lines.push(
    `\n## État de forme (PMC)\nForme/Fitness CTL ${ctx.fitness.ctl} · Fatigue ATL ${ctx.fitness.atl} · Fraîcheur TSB ${ctx.fitness.tsb}.`,
  );
  lines.push(
    `Charge 7j : ${ctx.load.weeklyLoad} · ratio aigu/chronique ${ctx.load.acwr} · fatigue ${ctx.load.fatigue}.`,
  );
  lines.push(`Interprétation TSB : >5 frais, -10..5 neutre, <-10 fatigué, <-30 surcharge.`);

  // Fatigue Intelligence (multi-dimensional model)
  if (ctx.fatigue && ctx.fatigue.fatigueLevel && ctx.fatigue.fatigueLevel !== 'INSUFFICIENT_DATA') {
    const f = ctx.fatigue;
    const LEVEL_FR: Record<string, string> = {
      FRESH: 'Frais (0-20)',
      FUNCTIONAL_LOW: 'Fatigue normale (21-40)',
      FUNCTIONAL_HIGH: 'Charge productive (41-60)',
      ACCUMULATED: 'Fatigue accumulée (61-75)',
      NON_FUNCTIONAL_RISK: 'Risque surcharge (76-88)',
      OVERREACHING_RISK: 'Surentraînement (89-100)',
    };
    const CAPACITY_FR: Record<string, string> = {
      FULL: 'totale',
      REDUCED: 'réduite (éviter haute intensité)',
      LIGHT_ONLY: "légère uniquement (Z1-Z2, pas d'intervalles)",
      REST_ONLY: 'repos uniquement',
    };
    const bits = [
      f.fatigueIndex != null ? `Index ${f.fatigueIndex}/100` : null,
      f.fatigueLevel ? (LEVEL_FR[f.fatigueLevel] ?? f.fatigueLevel) : null,
      f.trainingCapacity
        ? `Capacité d'entraînement ${CAPACITY_FR[f.trainingCapacity] ?? f.trainingCapacity}`
        : null,
      f.trajectory ? `Tendance : ${f.trajectory}` : null,
    ].filter(Boolean);
    lines.push(
      `\n## Fatigue Intelligence (modèle multi-dimensionnel SHARPIT)\n${bits.join(' · ')}.`,
    );
    if (f.primaryLimitingFactor) {
      lines.push(`Facteur limitant principal : ${f.primaryLimitingFactor}.`);
    }
    if (f.functionalOverreachingRisk && f.functionalOverreachingRisk !== 'LOW') {
      lines.push(
        `⚠ Risque de surentraînement fonctionnel : ${f.functionalOverreachingRisk}. Priorise la récupération avant d'augmenter la charge.`,
      );
    }
    if (f.estimatedTimeToFresh != null && f.fatigueLevel !== 'FRESH') {
      lines.push(`Retour à l'état frais estimé dans ${f.estimatedTimeToFresh} jour(s).`);
    }
    if (f.performanceImpairmentEstimate && f.performanceImpairmentEstimate > 0.1) {
      lines.push(
        `Capacité de performance estimée à ~${Math.round((1 - f.performanceImpairmentEstimate) * 100)}% du maximum.`,
      );
    }
  }

  // Adaptation Intelligence (multi-dimensional model)
  if (
    ctx.adaptation &&
    ctx.adaptation.adaptationStatus &&
    ctx.adaptation.adaptationStatus !== 'INSUFFICIENT_DATA'
  ) {
    const a = ctx.adaptation;
    const STATUS_FR: Record<string, string> = {
      POSITIVELY_ADAPTING: 'Adaptation positive',
      MAINTAINING: 'Maintien',
      PLATEAUING: 'Plateau',
      MALADAPTING: 'Maladaptation',
      DETRAINING: 'Désentraînement',
    };
    const TREND_FR: Record<string, string> = {
      IMPROVING: 'En progression',
      STABLE: 'Stable',
      DECLINING: 'En déclin',
    };
    const VERDICT_FR: Record<string, string> = {
      INCREASE_LOAD: 'Augmenter la charge',
      SUSTAIN: 'Maintenir la progression',
      CONSOLIDATE: 'Consolider avant de progresser',
      REDUCE_LOAD: 'Réduire la charge',
      RECOVERY_PRIORITY: 'Priorité récupération (fenêtre supercompensation)',
    };
    const bits = [
      a.adaptationIndex != null ? `Index ${a.adaptationIndex}/100` : null,
      a.adaptationStatus ? (STATUS_FR[a.adaptationStatus] ?? a.adaptationStatus) : null,
      a.adaptationTrend ? (TREND_FR[a.adaptationTrend] ?? a.adaptationTrend) : null,
    ].filter(Boolean);
    lines.push(
      `\n## Adaptation Intelligence (modèle multi-dimensionnel SHARPIT)\n${bits.join(' · ')}.`,
    );
    if (a.limitingFactor) {
      lines.push(`Facteur limitant : ${a.limitingFactor}.`);
    }
    if (a.decision?.verdict) {
      const multiplier =
        a.decision.loadMultiplier != null ? ` (×${a.decision.loadMultiplier.toFixed(2)})` : '';
      lines.push(`Verdict : ${VERDICT_FR[a.decision.verdict] ?? a.decision.verdict}${multiplier}.`);
    }
    if (a.overreachingWithoutAdaptationDetected) {
      lines.push(
        `⚠ Surentraînement sans adaptation détecté : charge élevée sans réponse autonomique. Réduire immédiatement.`,
      );
    }
    if (a.plateauRisk) {
      lines.push(
        `⚠ Risque de plateau : ≥ 14 jours sans progression d'adaptation. Un changement de stimulus est nécessaire.`,
      );
    }
    if (a.estimatedAdaptationPeak != null) {
      lines.push(`Pic de forme estimé dans ${a.estimatedAdaptationPeak} jour(s).`);
    }
  }

  // Reasoning Engine (cross-model synthesis)
  if (
    ctx.reasoning &&
    ctx.reasoning.overallVerdict &&
    ctx.reasoning.overallVerdict !== 'INSUFFICIENT_DATA'
  ) {
    const re = ctx.reasoning;
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
    const bits = [
      re.overallVerdict ? `Verdict : ${VERDICT_FR[re.overallVerdict] ?? re.overallVerdict}` : null,
      re.physiologicalConsistency
        ? `Modèles : ${CONSISTENCY_FR[re.physiologicalConsistency] ?? re.physiologicalConsistency} (score ${re.consistencyScore ?? '—'}/100)`
        : null,
    ].filter(Boolean);
    lines.push(`\n## Reasoning Engine (synthèse inter-modèles SHARPIT)\n${bits.join(' · ')}.`);
    if (re.topAction) {
      lines.push(
        `Action prioritaire : ${re.topAction.verb} — ${re.topAction.focus}. ${re.topAction.rationale}`,
      );
    }
    if (re.limitingFactor?.system && re.limitingFactor.description) {
      lines.push(
        `Facteur limitant : ${re.limitingFactor.system.toLowerCase()} — ${re.limitingFactor.description}.`,
      );
    }
    const criticalFinding = re.keyFindings?.find((f) => f.severity === 'CRITICAL');
    if (criticalFinding) {
      lines.push(`⚠ CRITIQUE : ${criticalFinding.title}.`);
    }
    if (re.conflicts && re.conflicts.length > 0) {
      lines.push(
        `Conflit inter-modèles détecté (${re.conflicts[0].type.replace(/_/g, ' ').toLowerCase()}) : ${re.conflicts[0].description}`,
      );
    }
    if (re.opportunities && re.opportunities.length > 0) {
      lines.push(
        `Opportunité : ${re.opportunities[0].title} (${re.opportunities[0].timeWindow.toLowerCase().replace('_', ' ')}).`,
      );
    }
  }

  // Santé
  const h = ctx.health;
  const healthBits = [
    h.readinessToday != null ? `Readiness du jour ${h.readinessToday}/100` : null,
    h.readinessLevel ? `(${h.readinessLevel})` : null,
    h.hrvStatus ? `HRV ${h.hrvStatus}` : null,
    h.bodyBattery != null ? `Body Battery ${h.bodyBattery}` : null,
    h.avgSleepMin != null
      ? `sommeil moy 7j ${Math.floor(h.avgSleepMin / 60)}h${(h.avgSleepMin % 60).toString().padStart(2, '0')}`
      : null,
    h.avgRestingHr != null ? `FC repos moy ${h.avgRestingHr}` : null,
    h.avgHrv != null ? `HRV moy ${h.avgHrv}` : null,
  ].filter(Boolean);
  if (healthBits.length) lines.push(`\n## Récupération\n${healthBits.join(' · ')}.`);

  // Disponibilités
  if (ctx.availableDays.length)
    lines.push(
      `\n## Disponibilités\nJours d'entraînement habituels : ${ctx.availableDays.join(', ')}.`,
    );

  // Objectifs
  lines.push('\n## Objectifs');
  if (ctx.primaryRace) {
    const pr = ctx.primaryRace;
    const extras = [
      pr.priority ? `priorité ${pr.priority}` : null,
      pr.raceFormat,
      pr.targetPerformance ? `objectif visé : ${pr.targetPerformance}` : null,
    ].filter(Boolean);
    lines.push(
      `Course principale : ${pr.title}${pr.location ? ` (${pr.location})` : ''} dans ${pr.daysToGo} jours (~${Math.round(pr.daysToGo / 7)} semaines)${extras.length ? ` — ${extras.join(', ')}` : ''}.`,
    );
  } else {
    lines.push('Pas de course planifiée.');
  }
  for (const r of ctx.races.filter((r) => r !== ctx.primaryRace)) {
    const extras = [
      r.priority ? `prio ${r.priority}` : null,
      r.targetPerformance ? `objectif : ${r.targetPerformance}` : null,
    ].filter(Boolean);
    lines.push(
      `Autre course : ${r.title} dans ${r.daysToGo} j${extras.length ? ` (${extras.join(', ')})` : ''}.`,
    );
  }
  for (const g of ctx.metricGoals) {
    lines.push(
      `Objectif métrique : ${g.title}${g.target != null ? ` → cible ${g.target}${g.unit ?? ''}${g.current != null ? ` (actuel ${g.current})` : ''}` : ''}.`,
    );
  }

  // Activités récentes
  if (ctx.recent.length) {
    lines.push('\n## Séances récentes (14 dernières)');
    for (const a of ctx.recent) {
      const extra = [
        a.load != null ? `charge ${a.load}` : null,
        a.rpe != null ? `RPE ${a.rpe}` : null,
        a.feeling ? `ressenti ${a.feeling}` : null,
        a.detail || null,
      ]
        .filter(Boolean)
        .join(' · ');
      lines.push(
        `- ${a.date}${a.relativeDay ? ` (${a.relativeDay})` : ''} · ${a.type} ${a.title} (${a.duration})${extra ? ` — ${extra}` : ''}`,
      );
    }
  }

  // Conformité des séances prévues récentes (exécution réelle)
  if (ctx.realizedSessions.length) {
    lines.push('\n## Exécution des séances prévues récentes (prévu vs réalisé)');
    for (const r of ctx.realizedSessions) {
      lines.push(
        `- ${r.date} · ${r.type} ${r.title} → conformité ${r.score ?? '?'}/100${r.verdict ? ` (${r.verdict})` : ''}${r.summary ? ` — ${r.summary}` : ''}`,
      );
    }
  }

  // Condition physique — contrainte forte pour le coach
  if (ctx.physical.length) {
    lines.push('\n## Condition physique à respecter (douleurs / blessures / mobilité / posture)');
    lines.push(
      "IMPÉRATIF : NE CONFONDS PAS les catégories, car elles n'impliquent PAS la même adaptation :",
    );
    lines.push(
      "- Douleur / Blessure : ne charge pas la zone concernée, réduis ou supprime l'intensité, voire annule la séance si la sévérité est élevée. C'est une contrainte forte.",
    );
    lines.push(
      "- Mobilité / Posture : ce N'EST PAS une douleur — n'allège pas l'endurance ni l'intensité pour ça. Propose plutôt du travail ciblé (mobilité, gainage, renforcement correctif) en complément, sans réduire la charge des séances clés.",
    );
    lines.push(
      'Tiens compte de la sévérité et de la tendance (amélioration/aggravation) pour doser.',
    );
    for (const p of ctx.physical) {
      const bits = [
        `${p.category} : ${p.title}`,
        p.bodyPart ? `zone ${p.bodyPart}${p.side ? ` (${p.side})` : ''}` : null,
        p.severity != null ? `sévérité ${p.severity}/10` : null,
        `statut ${p.status}`,
        p.trend ? `tendance ${p.trend}` : null,
        p.description || null,
      ]
        .filter(Boolean)
        .join(' · ');
      lines.push(`- ${bits}`);
    }
  }

  // Déjà planifié
  if (ctx.upcomingPlanned.length) {
    lines.push('\n## Déjà planifié (ne pas dupliquer)');
    for (const p of ctx.upcomingPlanned) {
      lines.push(
        `- ${p.date} · ${p.type} ${p.title}${p.intensity ? ` [${p.intensity}]` : ''}${p.durationMin ? ` ${p.durationMin} min` : ''}`,
      );
    }
  }

  return lines.join('\n');
}
