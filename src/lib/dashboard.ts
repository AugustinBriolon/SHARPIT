import type { RecoveryTone } from '@/lib/recovery';

/**
 * Logique d'agrégation du dashboard : transforme les signaux bruts (readiness,
 * forme/TSB, charge/ACWR) en un verdict actionnable, façon outil d'entraînement
 * pro (TrainingPeaks / Intervals.icu).
 */

// ---- Zone ACWR (ratio charge aiguë / chronique) ----

export interface AcwrZone {
  label: string;
  tone: RecoveryTone;
  hint: string;
}

/**
 * Zone "sweet spot" de la littérature : 0.8–1.3 idéal, >1.5 = risque de blessure
 * accru, <0.8 = sous-charge (perte de forme potentielle).
 */
export function acwrZone(acwr: number): AcwrZone {
  if (acwr <= 0) return { label: '—', tone: 'neutral', hint: 'Données insuffisantes' };
  if (acwr < 0.8)
    return {
      label: 'Sous-charge',
      tone: 'moderate',
      hint: 'Marge pour monter le volume',
    };
  if (acwr <= 1.3)
    return {
      label: 'Optimale',
      tone: 'good',
      hint: 'Zone idéale de progression',
    };
  if (acwr <= 1.5)
    return {
      label: 'Élevée',
      tone: 'moderate',
      hint: 'Surveille la fatigue',
    };
  return {
    label: 'Risque',
    tone: 'low',
    hint: 'Risque de blessure accru',
  };
}

// ---- Verdict du jour ----

export interface DayActivitySummary {
  count: number;
  totalLoad: number;
  sportLabels: string[];
}

export interface DayVerdictContext {
  /** L'utilisateur consulte le jour courant (pas hier/demain via le sélecteur). */
  isViewingToday: boolean;
  /** Heure locale 0–23. */
  hour: number;
  activitiesToday: DayActivitySummary;
  /** Séances planifiées non encore réalisées ce jour. */
  plannedRemaining: number;
  /** Renseignés automatiquement par buildTrainingVerdict. */
  deepFatigue?: boolean;
  highLoad?: boolean;
}

export interface TrainingVerdict {
  tone: RecoveryTone;
  title: string;
  message: string;
  cues: string[];
}

const VERDICT_TITLES: Record<RecoveryTone, string> = {
  good: "Feu vert pour l'intensité",
  moderate: 'Jour modéré conseillé',
  low: 'Priorité à la récupération',
  neutral: 'Fie-toi à ton ressenti',
};

/** Après une séance, on valorise l'effort sauf signaux de surcharge ou fatigue profonde. */
function toneAfterTraining(
  baseTone: RecoveryTone,
  ctx: { plannedRemaining: number; deepFatigue: boolean; highLoad: boolean },
): RecoveryTone {
  if (baseTone === 'low' || ctx.deepFatigue) return 'low';
  if (ctx.plannedRemaining > 0 && ctx.highLoad) return 'moderate';
  return 'good';
}

function applyDayContext(
  verdict: TrainingVerdict,
  ctx: DayVerdictContext | undefined,
): TrainingVerdict {
  if (!ctx?.isViewingToday) return verdict;

  const { hour, activitiesToday, plannedRemaining, deepFatigue, highLoad } = ctx;
  const trained = activitiesToday.count > 0;
  const cues = [...verdict.cues];

  if (trained) {
    const loadLabel =
      activitiesToday.totalLoad > 0 ? ` · ~${Math.round(activitiesToday.totalLoad)} TSS` : '';
    const sports =
      activitiesToday.sportLabels.length > 0
        ? activitiesToday.sportLabels.join(', ')
        : `${activitiesToday.count} séance${activitiesToday.count > 1 ? 's' : ''}`;
    cues.push(
      `${activitiesToday.count} séance${activitiesToday.count > 1 ? 's' : ''} aujourd'hui${loadLabel}`,
    );

    const tone = toneAfterTraining(verdict.tone, {
      plannedRemaining,
      deepFatigue: deepFatigue ?? false,
      highLoad: highLoad ?? false,
    });

    if (plannedRemaining === 0) {
      return {
        tone,
        title: "Belle journée d'entraînement",
        message:
          hour >= 18
            ? `Tu as enchaîné ${sports}${loadLabel} — objectif du jour atteint. Ce soir, récupération et sommeil pour capitaliser.`
            : `Tu as déjà tourné ${sports}${loadLabel}. Programme du jour bouclé : profite du reste de la journée pour récupérer.`,
        cues,
      };
    }

    if (hour >= 14) {
      return {
        tone,
        title: 'Déjà bien engagé',
        message: `Tu as déjà donné ${sports}${loadLabel}. Il reste ${plannedRemaining} séance${plannedRemaining > 1 ? 's' : ''} au programme : vise la qualité plutôt que d'empiler le volume.`,
        cues,
      };
    }

    return {
      tone,
      title: 'Séance(s) déjà réalisée(s)',
      message: `Tu as déjà tourné ${sports}${loadLabel}. Il reste ${plannedRemaining} séance${plannedRemaining > 1 ? 's' : ''} prévue${plannedRemaining > 1 ? 's' : ''} — ajuste l'intensité selon ton ressenti.`,
      cues,
    };
  }

  return { ...verdict, cues };
}

/**
 * Combine readiness (si dispo), forme (TSB) et charge (ACWR) en une
 * recommandation unique. Le readiness Garmin prime, mais une charge dangereuse
 * ou une fatigue profonde rétrograde le verdict pour éviter le surentraînement.
 *
 * Avec `dayContext`, le message s'adapte à l'heure et aux séances déjà faites.
 * Une journée active avec séance(s) réalisée(s) est valorisée (vert) sauf
 * surcharge ou fatigue profonde.
 */
export function buildTrainingVerdict(input: {
  readinessScore: number | null;
  readinessTone: RecoveryTone;
  tsb: number | null;
  acwr: number;
  dayContext?: DayVerdictContext;
}): TrainingVerdict {
  const { readinessScore, readinessTone, tsb, acwr, dayContext } = input;

  const deepFatigue = tsb != null && tsb <= -30;
  const highLoad = acwr >= 1.5;

  let tone: RecoveryTone =
    readinessScore != null
      ? readinessTone
      : tsb != null
        ? tsb >= -10
          ? 'good'
          : tsb >= -30
            ? 'moderate'
            : 'low'
        : 'neutral';

  // Garde-fous : on ne laisse pas un "feu vert" masquer une surcharge.
  if (tone === 'good' && (deepFatigue || highLoad)) tone = 'moderate';
  if (tone === 'moderate' && deepFatigue && highLoad) tone = 'low';

  const cues: string[] = [];

  if (readinessScore != null) {
    cues.push(`Readiness ${readinessScore}/100`);
  }
  if (tsb != null) {
    const form = tsb > 15 ? 'frais' : tsb >= -10 ? 'optimal' : tsb >= -30 ? 'fatigue' : 'surcharge';
    cues.push(`Forme ${tsb > 0 ? '+' : ''}${tsb} (${form})`);
  }
  if (acwr > 0) {
    cues.push(`Charge ${acwrZone(acwr).label.toLowerCase()} · ACWR ${acwr}`);
  }

  let message: string;
  switch (tone) {
    case 'good':
      message =
        'Tu es bien récupéré et ta charge est sous contrôle : tu peux encaisser une séance qualitative (seuil, VO2max ou gros volume).';
      break;
    case 'moderate':
      message = highLoad
        ? "Bonne disponibilité mais charge élevée : reste sur de l'endurance ou du technique, garde l'intensité max pour plus tard."
        : "Récupération partielle : privilégie une séance Z2 ou technique plutôt qu'une grosse intensité.";
      break;
    case 'low':
      message = deepFatigue
        ? 'Fatigue accumulée importante : repos ou récupération active. Forcer maintenant augmente le risque de blessure.'
        : 'Disponibilité faible : journée off ou footing très léger recommandé.';
      break;
    default:
      message =
        "Pas assez de données objectives aujourd'hui. Cale l'intensité sur ton ressenti et ta charge récente.";
  }

  const base: TrainingVerdict = { tone, title: VERDICT_TITLES[tone], message, cues };
  const ctx = dayContext ? { ...dayContext, deepFatigue, highLoad } : undefined;
  return applyDayContext(base, ctx);
}

// ---- Tendances (flèche d'évolution sur 7 jours) ----

export type TrendDirection = 'up' | 'down' | 'flat';

export interface TrendInfo {
  label: string;
  tone: 'good' | 'bad' | 'neutral';
  direction: TrendDirection;
}

/**
 * Interprète un delta de moyenne 7j vs 7j précédents. `higherIsBetter` adapte la
 * couleur (ex. HRV qui monte = bon, FC repos qui monte = mauvais).
 */
export function trendInfo(delta: number | null, higherIsBetter: boolean, unit = ''): TrendInfo {
  if (delta == null || Math.abs(delta) < 0.05) {
    return { label: 'stable', tone: 'neutral', direction: 'flat' };
  }
  const up = delta > 0;
  const good = up === higherIsBetter;
  const sign = up ? '+' : '';
  return {
    label: `${sign}${delta}${unit}`,
    tone: good ? 'good' : 'bad',
    direction: up ? 'up' : 'down',
  };
}
