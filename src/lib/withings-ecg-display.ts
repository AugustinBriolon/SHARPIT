import { WITHINGS_MEASURE } from '@/lib/integrations/withings-measures';
import type { CompositionMetricId } from '@/lib/composition-metric-guides';
import type { CorpsTone } from '@/components/corps/corps-ui';

/** Détail d'une classification ECG Withings (Body Scan / Scan Monitor). */
export interface WithingsEcgClassification {
  label: string;
  tone: CorpsTone;
  /** Ce que signifie ce résultat pour toi. */
  meaning: string;
  /** Comment te situer / que faire ensuite. */
  action: string;
}

/**
 * Classification Body Scan (schéma étendu 1–9, firmware Scan Monitor 2.0+).
 * @see https://support.withings.com/hc/en-us/articles/10727299605777
 */
const BODY_SCAN_ECG_1_BASED: Record<number, WithingsEcgClassification> = {
  1: {
    label: 'FC basse',
    tone: 'moderate',
    meaning:
      'Fréquence cardiaque inférieure à 50 bpm pendant l’enregistrement. L’algorithme ne peut pas classifier le rythme dans ces conditions.',
    action:
      'Mesure au repos complet. Si tu es sportif avec FC repos basse, c’est fréquent — compare avec ton historique Withings et ton médecin si besoin.',
  },
  2: {
    label: 'FC très élevée',
    tone: 'moderate',
    meaning:
      'Fréquence cardiaque supérieure à 150 bpm. L’enregistrement ne peut pas être classifié (effort, stress, caféine, etc.).',
    action:
      'Refais une mesure après 5–10 min de repos, sans parler ni bouger. Évite caféine et effort intense juste avant.',
  },
  3: {
    label: 'FC élevée — sans signe de FA',
    tone: 'good',
    meaning:
      'FC entre 100 et 150 bpm, rythme régulier, aucun signe de fibrillation auriculaire détecté sur cet enregistrement.',
    action:
      'Résultat rassurant sur le plan FA pour cette mesure. Une FC élevée peut venir du stress, de l’effort récent ou de la déshydratation.',
  },
  4: {
    label: 'Rythme sinusal',
    tone: 'good',
    meaning:
      'FC entre 50 et 99 bpm, battements réguliers. Aucun signe de fibrillation auriculaire sur cet enregistrement.',
    action:
      'Signal favorable. Ce n’est pas un monitor continu : une mesure normale n’exclut pas une FA paroxystique. Continue le suivi si tu as des symptômes.',
  },
  5: {
    label: 'Fibrillation auriculaire',
    tone: 'low',
    meaning:
      'FC entre 50 et 99 bpm avec rythme irrégulier compatible avec une fibrillation auriculaire.',
    action:
      'Si tu n’as pas encore de diagnostic de FA, consulte ton médecin. En cas de malaise, douleur thoracique ou essoufflement, appelle le 15.',
  },
  6: {
    label: 'FA — FC élevée',
    tone: 'low',
    meaning:
      'FC entre 100 et 150 bpm avec rythme irrégulier compatible avec une fibrillation auriculaire.',
    action:
      'Consulte ton médecin si ce résultat est nouveau pour toi. Ne panique pas sur une seule mesure, mais ne l’ignore pas non plus.',
  },
  7: {
    label: 'Non concluant',
    tone: 'moderate',
    meaning:
      'Enregistrement de bonne qualité, mais le signal ne peut être classé en rythme sinusal ou FA (arythmie autre, bloc de branche, etc.).',
    action:
      'Refais une mesure au calme, pieds nus, bras posés sur une table. Consulte si le résultat se répète ou si tu as des symptômes.',
  },
  8: {
    label: 'Autre arythmie détectée',
    tone: 'moderate',
    meaning:
      'Signes d’arythmie autre que la FA (extrasystoles, bloc de branche…). L’appareil ne diagnostique que la FA, pas les autres arythmies.',
    action:
      'Partage l’ECG PDF Withings à ton médecin pour interprétation. Une mesure isolée non concluante est fréquente chez les sportifs.',
  },
  9: {
    label: 'Mauvais enregistrement',
    tone: 'neutral',
    meaning:
      'Qualité du signal insuffisante pour classifier le rythme (mouvement, mauvaise posture, contact électrode).',
    action:
      'Pieds bien centrés sur la balance, mains sur la barre sans bouger, respiration calme pendant ~30 s. Refais la mesure en conditions identiques à l’app Withings.',
  },
};

/** Schéma legacy API (0–6) — ScanWatch / anciennes versions. */
const LEGACY_ECG: Record<number, WithingsEcgClassification> = {
  0: BODY_SCAN_ECG_1_BASED[4]!,
  1: BODY_SCAN_ECG_1_BASED[5]!,
  2: BODY_SCAN_ECG_1_BASED[7]!,
  3: BODY_SCAN_ECG_1_BASED[9]!,
  4: BODY_SCAN_ECG_1_BASED[1]!,
  5: BODY_SCAN_ECG_1_BASED[3]!,
  6: {
    label: 'FC basse (legacy)',
    tone: 'moderate',
    meaning: 'Fréquence cardiaque trop basse pour classifier le rythme (< 50 bpm).',
    action: 'Mesure au repos complet, puis refais un enregistrement.',
  },
};

export function resolveWithingsEcgClassification(code: number): WithingsEcgClassification {
  const rounded = Math.round(code);
  if (BODY_SCAN_ECG_1_BASED[rounded]) return BODY_SCAN_ECG_1_BASED[rounded]!;
  if (LEGACY_ECG[rounded]) return LEGACY_ECG[rounded]!;
  return {
    label: `Résultat ECG (code ${rounded})`,
    tone: 'neutral',
    meaning:
      'Withings a renvoyé un code que SHARPIT ne reconnaît pas encore. Le libellé exact est visible dans l’app Withings (section ECG de ta pesée).',
    action:
      'Ouvre l’app Withings → ta dernière pesée → ECG pour voir le résultat officiel. Dis-nous le libellé affiché si tu veux qu’on ajoute ce code.',
  };
}

export function formatAfibResult(value: number): string {
  return resolveWithingsEcgClassification(value).label;
}

export function afibTone(value: number): CorpsTone {
  return resolveWithingsEcgClassification(value).tone;
}

export function getAfibInterpretation(value: number): {
  zoneLabel: string;
  tone: CorpsTone;
  personalizedNote: string | null;
} {
  const info = resolveWithingsEcgClassification(value);
  let note: string | null = null;
  if (info.tone === 'good') {
    note =
      'Comparé au rythme sinusal normal : aucun signe de fibrillation auriculaire sur cette mesure.';
  } else if (info.tone === 'low') {
    note =
      'Écart par rapport au normal : signes compatibles avec une fibrillation auriculaire. Consulte si ce résultat est nouveau pour toi.';
  } else if (info.tone === 'moderate') {
    note =
      'Non classifiable comme rythme sinusal ou FA — refaire une mesure au calme ou consulter si ça se répète.';
  } else if (info.tone === 'neutral') {
    note = 'Enregistrement insuffisant pour comparer au rythme normal — refaire la mesure.';
  }
  return { zoneLabel: info.label, tone: info.tone, personalizedNote: note };
}

/** Position sur l'échelle 0–100 pour l'explainer (3 zones : normal / non concluant / FA). */
export function afibToScaleValue(value: number): number {
  const { tone } = resolveWithingsEcgClassification(value);
  if (tone === 'good') return 15;
  if (tone === 'low') return 85;
  if (tone === 'moderate') return 50;
  return 25;
}

const ECG_GUIDE_IDS: Record<number, CompositionMetricId> = {
  [WITHINGS_MEASURE.AFIB_ECG]: 'afibEcg',
  [WITHINGS_MEASURE.AFIB_ECG_CLASS]: 'afibEcg',
  [WITHINGS_MEASURE.AFIB_PPG]: 'afibPpg',
  [WITHINGS_MEASURE.QRS_INTERVAL]: 'qrsInterval',
  [WITHINGS_MEASURE.PR_INTERVAL]: 'prInterval',
  [WITHINGS_MEASURE.QT_INTERVAL]: 'qtInterval',
  [WITHINGS_MEASURE.QTC_INTERVAL]: 'qtcInterval',
};

const ECG_LABELS: Record<number, string> = {
  [WITHINGS_MEASURE.AFIB_ECG]: 'Résultat ECG (6 dérivations)',
  [WITHINGS_MEASURE.AFIB_PPG]: 'Résultat FA (PPG)',
  [WITHINGS_MEASURE.QRS_INTERVAL]: 'Intervalle QRS',
  [WITHINGS_MEASURE.PR_INTERVAL]: 'Intervalle PR',
  [WITHINGS_MEASURE.QT_INTERVAL]: 'Intervalle QT',
  [WITHINGS_MEASURE.QTC_INTERVAL]: 'Intervalle QTc',
};

export interface WithingsEcgStat {
  type: number;
  label: string;
  guideId: CompositionMetricId;
  value: number;
  displayValue: string;
}

function isAfibType(type: number): boolean {
  return (
    type === WITHINGS_MEASURE.AFIB_ECG ||
    type === WITHINGS_MEASURE.AFIB_ECG_CLASS ||
    type === WITHINGS_MEASURE.AFIB_PPG
  );
}

export function parseWithingsEcgStats(extras: unknown): WithingsEcgStat[] {
  if (extras == null || typeof extras !== 'object') return [];
  const parsed = extras as {
    ecg?: Record<string, number>;
    ecgAfibClassification?: number;
  };
  const { ecg, ecgAfibClassification } = parsed;
  if (!ecg && ecgAfibClassification == null) return [];

  const stats: WithingsEcgStat[] = [];
  const skipAfibKeys = new Set<string>();

  if (ecgAfibClassification != null) {
    stats.push({
      type: WITHINGS_MEASURE.AFIB_ECG,
      label: ECG_LABELS[WITHINGS_MEASURE.AFIB_ECG]!,
      guideId: 'afibEcg',
      value: ecgAfibClassification,
      displayValue: formatAfibResult(ecgAfibClassification),
    });
    skipAfibKeys.add(String(WITHINGS_MEASURE.AFIB_ECG));
    skipAfibKeys.add(String(WITHINGS_MEASURE.AFIB_ECG_CLASS));
  }

  if (!ecg) return stats;

  for (const [typeKey, rawValue] of Object.entries(ecg)) {
    if (skipAfibKeys.has(typeKey)) continue;
    const type = Number(typeKey);
    const guideId = ECG_GUIDE_IDS[type];
    if (!guideId) continue;

    const label = ECG_LABELS[type] ?? `ECG type ${typeKey}`;
    const displayValue = isAfibType(type)
      ? formatAfibResult(rawValue)
      : `${Math.round(rawValue)} ms`;

    stats.push({ type, label, guideId, value: rawValue, displayValue });
  }

  return stats;
}
