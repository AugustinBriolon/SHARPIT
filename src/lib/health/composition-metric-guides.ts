import type { CorpsTone } from '@/components/corps/corps-ui';
import { corpsToneFromAgeDelta, maxCorpsTone } from './health-status';
import { getAfibInterpretation, afibToScaleValue } from '@/lib/integrations/withings-ecg-display';

export type CompositionMetricId =
  | 'bmi'
  | 'bodyFatPct'
  | 'musclePct'
  | 'visceralFat'
  | 'waterPct'
  | 'bmr'
  | 'metabolicAge'
  | 'vascularAgeYears'
  | 'pulseWaveVelocity'
  | 'nerveHealthScore'
  | 'nerveResponseScore'
  | 'skinConductance'
  | 'vo2Max'
  | 'heartRate'
  | 'afibEcg'
  | 'afibPpg'
  | 'qrsInterval'
  | 'prInterval'
  | 'qtInterval'
  | 'qtcInterval';

export interface CompositionContext {
  heightM: number | null;
  weightKg: number | null;
  /** Âge chronologique (profil athlète, calculé depuis la date de naissance). */
  chronologicalAgeYears: number | null;
}

export interface MetricZone {
  label: string;
  min: number;
  max: number;
  tone: CorpsTone;
}

export interface MetricInterpretation {
  zoneLabel: string;
  tone: CorpsTone;
  personalizedNote: string | null;
}

export interface MetricGuide {
  id: CompositionMetricId;
  title: string;
  unit: string;
  summary: string;
  explanation: string;
  caveats?: string;
  zones: MetricZone[];
  /** Masque l'échelle visuelle (résultats catégoriels sans repère). */
  hideScale?: boolean;
  /** Transforme la valeur brute en position sur l'échelle (ex. codes ECG catégoriels). */
  scaleValue?: (value: number) => number;
  interpret: (value: number, ctx: CompositionContext) => MetricInterpretation;
}

function between(value: number, min: number, max: number): boolean {
  return value >= min && value < max;
}

function pickZone(value: number, zones: MetricZone[]): MetricZone {
  const match = zones.find((z) => between(value, z.min, z.max));
  return match ?? zones[zones.length - 1]!;
}

function ageDeltaNote(metricAge: number, chrono: number | null, label: string): string | null {
  if (chrono == null) return null;
  const delta = metricAge - chrono;
  if (delta <= -3)
    return `${label} inférieur de ${Math.abs(delta)} ans à ton âge — signal favorable.`;
  if (delta >= 3)
    return `${label} supérieur de ${delta} ans à ton âge — à surveiller dans la durée.`;
  return `${label} proche de ton âge chronologique (${chrono} ans).`;
}

export const COMPOSITION_METRIC_GUIDES: Record<CompositionMetricId, MetricGuide> = {
  bmi: {
    id: 'bmi',
    title: 'Indice de masse corporelle (IMC)',
    unit: '',
    summary: 'Rapport poids / taille² — repère populationnel, pas une mesure de forme sportive.',
    explanation:
      "L'IMC classe le poids par rapport à la taille. Chez un sportif musclé, il peut être « élevé » sans excès de graisse. Utilise-le surtout pour suivre une tendance, pas comme verdict isolé.",
    zones: [
      { label: 'Insuffisance', min: 0, max: 18.5, tone: 'watch' },
      { label: 'Normal', min: 18.5, max: 25, tone: 'ok' },
      { label: 'Surpoids', min: 25, max: 30, tone: 'watch' },
      { label: 'Obésité', min: 30, max: 50, tone: 'attention' },
    ],
    interpret(value, ctx) {
      const zone = pickZone(value, COMPOSITION_METRIC_GUIDES.bmi.zones);
      let note: string | null = null;
      if (ctx.heightM != null && ctx.weightKg != null) {
        note = `Avec ${ctx.heightM.toFixed(2)} m et ${ctx.weightKg.toFixed(1)} kg, l'IMC théorique coïncide avec cette mesure.`;
      }
      return { zoneLabel: zone.label, tone: zone.tone, personalizedNote: note };
    },
  },
  bodyFatPct: {
    id: 'bodyFatPct',
    title: 'Masse grasse',
    unit: '%',
    summary: 'Part estimée du poids total — impédancemétrie, écart fréquent vs DEXA.',
    explanation:
      'La balance estime la graisse via un courant électrique faible. L’hydratation, l’heure de pesée et la posture modifient le résultat. La tendance sur plusieurs semaines est plus fiable qu’une mesure isolée.',
    zones: [
      { label: 'Très basse', min: 0, max: 8, tone: 'watch' },
      { label: 'Athlétique', min: 8, max: 15, tone: 'ok' },
      { label: 'Modérée', min: 15, max: 22, tone: 'ok' },
      { label: 'Élevée', min: 22, max: 100, tone: 'watch' },
    ],
    interpret(value) {
      const zone = pickZone(value, COMPOSITION_METRIC_GUIDES.bodyFatPct.zones);
      return { zoneLabel: zone.label, tone: zone.tone, personalizedNote: null };
    },
  },
  musclePct: {
    id: 'musclePct',
    title: 'Masse musculaire',
    unit: '%',
    summary: 'Part du poids total — définition Withings (masse musculaire / poids).',
    explanation:
      'Withings calcule un pourcentage à partir de la masse musculaire en kg. Ce n’est pas identique au « muscle squelettique » Renpho : compare surtout l’évolution dans le temps, pas les valeurs absolues entre marques.',
    zones: [
      { label: 'Bas', min: 0, max: 65, tone: 'watch' },
      { label: 'Typique', min: 65, max: 80, tone: 'ok' },
      { label: 'Élevé', min: 80, max: 100, tone: 'ok' },
    ],
    interpret(value) {
      const zone = pickZone(value, COMPOSITION_METRIC_GUIDES.musclePct.zones);
      return { zoneLabel: zone.label, tone: zone.tone, personalizedNote: null };
    },
  },
  visceralFat: {
    id: 'visceralFat',
    title: 'Indice graisse viscérale',
    unit: '',
    summary: 'Indice Withings (≈ 1–20) — graisse autour des organes, pas un %.',
    explanation:
      'Plus l’indice est bas, mieux c’est en général. C’est une estimation : repas récents, stress et entraînement peuvent influencer la mesure du jour.',
    zones: [
      { label: 'Optimal', min: 0, max: 6, tone: 'ok' },
      { label: 'Modéré', min: 6, max: 12, tone: 'watch' },
      { label: 'Élevé', min: 12, max: 30, tone: 'attention' },
    ],
    interpret(value) {
      const zone = pickZone(value, COMPOSITION_METRIC_GUIDES.visceralFat.zones);
      return { zoneLabel: zone.label, tone: zone.tone, personalizedNote: null };
    },
  },
  waterPct: {
    id: 'waterPct',
    title: 'Eau corporelle',
    unit: '%',
    summary: 'Hydratation estimée — varie fortement dans la journée.',
    explanation:
      'L’eau corporelle reflète surtout l’hydratation du moment. Pesée le matin à jeun donne des comparaisons plus stables qu’après un repas ou une séance.',
    zones: [
      { label: 'Bas', min: 0, max: 50, tone: 'watch' },
      { label: 'Typique', min: 50, max: 65, tone: 'ok' },
      { label: 'Élevé', min: 65, max: 100, tone: 'ok' },
    ],
    interpret(value) {
      const zone = pickZone(value, COMPOSITION_METRIC_GUIDES.waterPct.zones);
      return { zoneLabel: zone.label, tone: zone.tone, personalizedNote: null };
    },
  },
  bmr: {
    id: 'bmr',
    title: 'Métabolisme basal (BMR)',
    unit: 'kcal/j',
    summary: 'Énergie estimée au repos — dépend du poids, masse maigre et âge.',
    explanation:
      'Le BMR est une estimation de tes besoins caloriques au repos complet. Utile pour le suivi nutritionnel ; la dépense réelle inclut activité, NEAT et entraînement.',
    zones: [
      { label: 'Bas', min: 0, max: 1400, tone: 'watch' },
      { label: 'Typique', min: 1400, max: 2200, tone: 'ok' },
      { label: 'Élevé', min: 2200, max: 4000, tone: 'ok' },
    ],
    interpret(value, ctx) {
      const zone = pickZone(value, COMPOSITION_METRIC_GUIDES.bmr.zones);
      const note =
        ctx.weightKg != null
          ? `Pour ${ctx.weightKg.toFixed(0)} kg, un BMR autour de ${Math.round(value)} kcal est cohérent avec une estimation impédancemétrique.`
          : null;
      return { zoneLabel: zone.label, tone: zone.tone, personalizedNote: note };
    },
  },
  metabolicAge: {
    id: 'metabolicAge',
    title: 'Âge métabolique',
    unit: 'ans',
    summary: 'Âge « fonctionnel » estimé par la balance — comparer à ton âge réel.',
    explanation:
      'Withings compare ton profil (masse maigre, graisse, BMR…) à des références populationnelles. Un âge métabolique inférieur à ton âge chronologique est généralement interprété positivement.',
    zones: [
      { label: 'Jeune', min: 0, max: 30, tone: 'ok' },
      { label: 'Modéré', min: 30, max: 45, tone: 'ok' },
      { label: 'Élevé', min: 45, max: 100, tone: 'watch' },
    ],
    interpret(value, ctx) {
      if (ctx.chronologicalAgeYears == null) {
        return {
          zoneLabel: 'Âge estimé',
          tone: 'neutral',
          personalizedNote: null,
        };
      }
      const zone = pickZone(value, COMPOSITION_METRIC_GUIDES.metabolicAge.zones);
      const ageTone = corpsToneFromAgeDelta(value, ctx.chronologicalAgeYears) ?? 'ok';
      const tone = maxCorpsTone(zone.tone, ageTone);
      return {
        zoneLabel: zone.label,
        tone,
        personalizedNote: ageDeltaNote(value, ctx.chronologicalAgeYears, 'Âge métabolique'),
      };
    },
  },
  vascularAgeYears: {
    id: 'vascularAgeYears',
    title: 'Âge vasculaire',
    unit: 'ans',
    summary: 'Indicateur Body Scan de rigidité artérielle — à comparer à ton âge.',
    explanation:
      'Dérivé de la vitesse d’onde de pouls (PWV) et d’algorithmes Withings. Un âge vasculaire proche ou inférieur à ton âge chronologique suggère une bonne souplesse vasculaire. Une mesure isolée ne remplace pas un avis médical.',
    zones: [
      { label: 'Favorable', min: 0, max: 35, tone: 'ok' },
      { label: 'Modéré', min: 35, max: 50, tone: 'watch' },
      { label: 'Élevé', min: 50, max: 100, tone: 'attention' },
    ],
    interpret(value, ctx) {
      const zone = pickZone(value, COMPOSITION_METRIC_GUIDES.vascularAgeYears.zones);
      const ageTone = corpsToneFromAgeDelta(value, ctx.chronologicalAgeYears);
      const tone = ageTone != null ? maxCorpsTone(zone.tone, ageTone) : zone.tone;
      return {
        zoneLabel: zone.label,
        tone,
        personalizedNote: ageDeltaNote(value, ctx.chronologicalAgeYears, 'Âge vasculaire'),
      };
    },
  },
  pulseWaveVelocity: {
    id: 'pulseWaveVelocity',
    title: "Vitesse d'onde de pouls (PWV)",
    unit: 'm/s',
    summary: 'Plus la PWV est basse, plus les artères sont souples (en général).',
    explanation:
      'Mesurée debout sur la Body Scan. Des valeurs plus basses sont associées à une meilleure souplesse artérielle. Hydratation, caféine, stress et effort récent peuvent la modifier.',
    zones: [
      { label: 'Optimal', min: 0, max: 7.1, tone: 'ok' },
      { label: 'Normal', min: 7.1, max: 8.5, tone: 'ok' },
      { label: 'Modéré', min: 8.5, max: 10, tone: 'watch' },
      { label: 'Élevé', min: 10, max: 20, tone: 'attention' },
    ],
    interpret(value) {
      const zone = pickZone(value, COMPOSITION_METRIC_GUIDES.pulseWaveVelocity.zones);
      return { zoneLabel: zone.label, tone: zone.tone, personalizedNote: null };
    },
  },
  nerveHealthScore: {
    id: 'nerveHealthScore',
    title: 'Santé nerveuse (pieds)',
    unit: '/100',
    summary: 'Score Body Scan — fonction sudomotrice des pieds (ESC).',
    explanation:
      'Withings évalue la réponse des glandes sudoripares des pieds via conductance cutanée. Un score plus élevé est généralement interprété positivement. Facteurs externes : température, peau sèche, callosités.',
    zones: [
      { label: 'À surveiller', min: 0, max: 50, tone: 'attention' },
      { label: 'Modéré', min: 50, max: 75, tone: 'watch' },
      { label: 'Bon', min: 75, max: 101, tone: 'ok' },
    ],
    interpret(value) {
      const zone = pickZone(value, COMPOSITION_METRIC_GUIDES.nerveHealthScore.zones);
      return { zoneLabel: zone.label, tone: zone.tone, personalizedNote: null };
    },
  },
  nerveResponseScore: {
    id: 'nerveResponseScore',
    title: 'Score réponse nerveuse (NRS)',
    unit: '/100',
    summary: 'Réactivité nerveuse estimée lors du test Body Scan.',
    explanation:
      'Complète le score de santé nerveuse des pieds. Suis surtout l’évolution dans le temps plutôt qu’une valeur isolée.',
    zones: [
      { label: 'Bas', min: 0, max: 50, tone: 'watch' },
      { label: 'Typique', min: 50, max: 75, tone: 'ok' },
      { label: 'Élevé', min: 75, max: 101, tone: 'ok' },
    ],
    interpret(value) {
      const zone = pickZone(value, COMPOSITION_METRIC_GUIDES.nerveResponseScore.zones);
      return { zoneLabel: zone.label, tone: zone.tone, personalizedNote: null };
    },
  },
  skinConductance: {
    id: 'skinConductance',
    title: 'Conductance cutanée (ESC)',
    unit: '',
    summary: 'Mesure électrodermale — liée à l’activité sudoripare.',
    explanation:
      'L’ESC reflète la capacité de la peau des pieds à conduire un faible courant. Withings l’utilise dans le calcul de la santé nerveuse. Peau très sèche ou froide peut abaisser la valeur.',
    zones: [
      { label: 'Bas', min: 0, max: 40, tone: 'watch' },
      { label: 'Typique', min: 40, max: 70, tone: 'ok' },
      { label: 'Élevé', min: 70, max: 200, tone: 'ok' },
    ],
    interpret(value) {
      const zone = pickZone(value, COMPOSITION_METRIC_GUIDES.skinConductance.zones);
      return { zoneLabel: zone.label, tone: zone.tone, personalizedNote: null };
    },
  },
  vo2Max: {
    id: 'vo2Max',
    title: 'VO₂ max estimé',
    unit: 'ml/kg/min',
    summary: 'Capacité aérobie estimée — dérivée de la balance, pas d’un test labo.',
    explanation:
      'Estimation basée sur plusieurs signaux Withings. Pour un suivi précis de performance, un test effort (lactate, analyse respiratoire) ou une montre Garmin reste plus fiable.',
    zones: [
      { label: 'Bas', min: 0, max: 35, tone: 'watch' },
      { label: 'Correct', min: 35, max: 45, tone: 'ok' },
      { label: 'Bon', min: 45, max: 55, tone: 'ok' },
      { label: 'Excellent', min: 55, max: 100, tone: 'ok' },
    ],
    interpret(value) {
      const zone = pickZone(value, COMPOSITION_METRIC_GUIDES.vo2Max.zones);
      return { zoneLabel: zone.label, tone: zone.tone, personalizedNote: null };
    },
  },
  heartRate: {
    id: 'heartRate',
    title: 'Fréquence cardiaque debout',
    unit: 'bpm',
    summary: 'FC mesurée debout sur la balance — contexte repos recommandé.',
    explanation:
      'Une FC debout au repos typique se situe souvent entre 50 et 80 bpm chez un adulte entraîné. Caféine, manque de sommeil ou stress du jour influencent la mesure.',
    zones: [
      { label: 'Bas', min: 0, max: 50, tone: 'ok' },
      { label: 'Typique', min: 50, max: 80, tone: 'ok' },
      { label: 'Élevé', min: 80, max: 200, tone: 'watch' },
    ],
    interpret(value) {
      const zone = pickZone(value, COMPOSITION_METRIC_GUIDES.heartRate.zones);
      return { zoneLabel: zone.label, tone: zone.tone, personalizedNote: null };
    },
  },
  afibEcg: {
    id: 'afibEcg',
    title: 'Résultat ECG (6 dérivations)',
    unit: '',
    summary: 'Classification du rythme cardiaque via l’ECG Body Scan.',
    explanation:
      'L’ECG mesure l’activité électrique du cœur. Withings compare ton enregistrement à un rythme sinusal normal (battements réguliers, sans fibrillation auriculaire). Mesure ponctuelle — ne remplace pas un avis médical.',
    scaleValue: afibToScaleValue,
    zones: [
      { label: 'Rythme normal', min: 0, max: 34, tone: 'ok' },
      { label: 'Non concluant', min: 34, max: 67, tone: 'watch' },
      { label: 'FA détectée', min: 67, max: 100, tone: 'attention' },
    ],
    interpret(value) {
      return getAfibInterpretation(value);
    },
  },
  afibPpg: {
    id: 'afibPpg',
    title: 'Résultat FA (PPG)',
    unit: '',
    summary: 'Détection FA via le pouls optique pendant la pesée.',
    explanation:
      'Analyse du pouls pour repérer une fibrillation auriculaire. Moins précis qu’un ECG complet, utile comme alerte complémentaire.',
    scaleValue: afibToScaleValue,
    zones: [
      { label: 'Rythme normal', min: 0, max: 34, tone: 'ok' },
      { label: 'Non concluant', min: 34, max: 67, tone: 'watch' },
      { label: 'FA détectée', min: 67, max: 100, tone: 'attention' },
    ],
    interpret(value) {
      return getAfibInterpretation(value);
    },
  },
  qrsInterval: {
    id: 'qrsInterval',
    title: 'Intervalle QRS',
    unit: 'ms',
    summary: 'Durée de la dépolarisation ventriculaire sur l’ECG.',
    explanation:
      'Le QRS correspond à l’activation des ventricules. Un intervalle trop large peut suggérer un bloc de branche ou une conduction lente. Les valeurs normales adultes sont souvent entre 80 et 120 ms.',
    zones: [
      { label: 'Étroit', min: 0, max: 80, tone: 'ok' },
      { label: 'Normal', min: 80, max: 120, tone: 'ok' },
      { label: 'Large', min: 120, max: 200, tone: 'watch' },
    ],
    interpret(value) {
      const zone = pickZone(value, COMPOSITION_METRIC_GUIDES.qrsInterval.zones);
      return { zoneLabel: zone.label, tone: zone.tone, personalizedNote: null };
    },
  },
  prInterval: {
    id: 'prInterval',
    title: 'Intervalle PR',
    unit: 'ms',
    summary: 'Délai entre l’onde P et le début du QRS.',
    explanation:
      'Mesure la conduction atrio-ventriculaire. Typiquement 120–200 ms au repos. Un PR allongé peut refléter un ralentissement de conduction (ex. bloc AV du 1er degré).',
    zones: [
      { label: 'Court', min: 0, max: 120, tone: 'watch' },
      { label: 'Normal', min: 120, max: 200, tone: 'ok' },
      { label: 'Allongé', min: 200, max: 320, tone: 'watch' },
    ],
    interpret(value) {
      const zone = pickZone(value, COMPOSITION_METRIC_GUIDES.prInterval.zones);
      return { zoneLabel: zone.label, tone: zone.tone, personalizedNote: null };
    },
  },
  qtInterval: {
    id: 'qtInterval',
    title: 'Intervalle QT',
    unit: 'ms',
    summary: 'Durée totale de repolarisation ventriculaire (non corrigée).',
    explanation:
      'Le QT varie avec la fréquence cardiaque — il faut le lire avec le QTc pour comparer entre mesures. Seul, il sert surtout de repère brut sur une même séance.',
    zones: [
      { label: 'Court', min: 0, max: 350, tone: 'ok' },
      { label: 'Typique', min: 350, max: 450, tone: 'ok' },
      { label: 'Long', min: 450, max: 600, tone: 'watch' },
    ],
    interpret(value) {
      const zone = pickZone(value, COMPOSITION_METRIC_GUIDES.qtInterval.zones);
      return {
        zoneLabel: zone.label,
        tone: zone.tone,
        personalizedNote: 'Préfère le QTc pour interpréter la repolarisation entre mesures.',
      };
    },
  },
  qtcInterval: {
    id: 'qtcInterval',
    title: 'Intervalle QTc (corrigé)',
    unit: 'ms',
    summary: 'QT ajusté à la fréquence cardiaque — repère de repolarisation.',
    explanation:
      'Le QTc corrige le QT selon la FC. En pratique clinique, un QTc > 450 ms (homme) ou > 460 ms (femme) mérite attention. Ici, c’est un repère sportif/éducatif issu de l’ECG balance.',
    zones: [
      { label: 'Normal', min: 0, max: 450, tone: 'ok' },
      { label: 'Limite', min: 450, max: 480, tone: 'watch' },
      { label: 'Allongé', min: 480, max: 600, tone: 'attention' },
    ],
    interpret(value) {
      const zone = pickZone(value, COMPOSITION_METRIC_GUIDES.qtcInterval.zones);
      return { zoneLabel: zone.label, tone: zone.tone, personalizedNote: null };
    },
  },
};

export function metricScalePosition(value: number, zones: MetricZone[]): number {
  const min = zones[0]?.min ?? 0;
  const max = zones[zones.length - 1]?.max ?? 100;
  if (max <= min) return 50;
  return Math.max(4, Math.min(96, ((value - min) / (max - min)) * 100));
}

export function getGuide(id: CompositionMetricId): MetricGuide {
  return COMPOSITION_METRIC_GUIDES[id];
}
