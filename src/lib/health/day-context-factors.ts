/**
 * Day-context factors for the athlete journal / morning check-in.
 * Day signals only — longer modes (En pause / Blessé / Malade) live in activity-status.
 *
 * Night-window factors (`prior_night`) describe the night that ends on this training day:
 * evening of J-1 through wake on J. Daytime factors describe the calendar training day itself.
 *
 * IDs are stable longitudinal keys (future practice ↔ recovery correlations). Do not rename.
 */

export const DAY_CONTEXT_FACTOR_IDS = [
  'coffee',
  'mood_low',
  'hydration_low',
  'late_meal',
  'device_in_bed',
  'alcohol',
  'omega3',
  'creatine',
  'vitamin_d',
  'magnesium',
  'ashwagandha',
  'multivitamin',
  'zinc',
  'probiotic',
  'electrolytes',
  'collagen',
  'protein_powder',
  'hydration_quality',
  'menstruation',
  'tobacco',
  'sauna',
  'intermittent_fasting',
  'fever',
  'cold_shower',
  'cupping',
  'cbd',
  'sun_exposure',
  'added_sugar',
  'headache',
  'pain',
  'allergies',
  'cold_congestion',
  'cramps',
  'massage',
  'mobility',
  'meditation',
  'easy_walk',
  'pneumatic_recovery',
  'meal_out',
  'skipped_meal',
  'night_work',
] as const;

export type DayContextFactorId = (typeof DAY_CONTEXT_FACTOR_IDS)[number];

/** `prior_night` = nuit qui se termine le matin du jour d’entraînement (J-1 → J). */
export type DayContextFactorWindow = 'calendar_day' | 'prior_night';

export type DayContextFactorGroup =
  | 'basics'
  | 'prior_night'
  | 'alcohol'
  | 'supplements'
  | 'cycle'
  | 'lifestyle'
  | 'nutrition'
  | 'health'
  | 'behaviour';

export type DayContextFactor = {
  id: DayContextFactorId;
  label: string;
  /** Short hint shown under the chip group. */
  hint: string;
  window: DayContextFactorWindow;
  group: DayContextFactorGroup;
};

function day(
  id: DayContextFactorId,
  label: string,
  hint: string,
  group: DayContextFactorGroup,
): DayContextFactor {
  return { id, label, hint, window: 'calendar_day', group };
}

export const DAY_CONTEXT_FACTORS: readonly DayContextFactor[] = [
  day('coffee', 'Café', 'Stimulant sur la journée', 'basics'),
  day('mood_low', 'Humeur basse', 'Moral en retrait sur la journée', 'basics'),
  day('hydration_low', 'Hydratation', 'Pas assez bu sur la journée', 'basics'),
  {
    id: 'late_meal',
    label: 'Repas tardif',
    hint: 'Nuit dernière (J-1 → J) — dîner / collation avant le sommeil',
    window: 'prior_night',
    group: 'prior_night',
  },
  {
    id: 'device_in_bed',
    label: 'Écran au lit',
    hint: 'Nuit dernière (J-1 → J) — appareil avant le sommeil',
    window: 'prior_night',
    group: 'prior_night',
  },
  day('alcohol', 'Alcool', 'Consommation d’alcool sur la journée', 'alcohol'),
  day('omega3', 'Oméga-3', 'Complément pris aujourd’hui', 'supplements'),
  day('creatine', 'Créatine', 'Complément pris aujourd’hui', 'supplements'),
  day('vitamin_d', 'Vitamine D', 'Complément pris aujourd’hui', 'supplements'),
  day('magnesium', 'Magnésium', 'Complément pris aujourd’hui', 'supplements'),
  day('ashwagandha', 'Ashwagandha', 'Complément pris aujourd’hui', 'supplements'),
  day('multivitamin', 'Multivitamines', 'Complément pris aujourd’hui', 'supplements'),
  day('zinc', 'Zinc', 'Complément pris aujourd’hui', 'supplements'),
  day('probiotic', 'Probiotique', 'Complément pris aujourd’hui', 'supplements'),
  day('electrolytes', 'Électrolytes', 'Complément / boisson électrolytes', 'supplements'),
  day('collagen', 'Collagène', 'Complément pris aujourd’hui', 'supplements'),
  day('protein_powder', 'Protéine en poudre', 'Shake / protéine prise', 'supplements'),
  day('hydration_quality', 'Bonne hydratation', 'Ressenti d’hydratation suffisante', 'supplements'),
  day('menstruation', 'Menstruation', 'Jour de règles', 'cycle'),
  day('tobacco', 'Tabac', 'Consommation de tabac', 'health'),
  day('fever', 'Fièvre', 'Température élevée', 'health'),
  day('headache', 'Maux de tête', 'Céphalée sur la journée', 'health'),
  day('pain', 'Douleur', 'Douleur musculaire / articulaire', 'health'),
  day('allergies', 'Allergies', 'Symptômes allergiques', 'health'),
  day('cold_congestion', 'Rhume / congestion', 'Voies respiratoires encombrées', 'health'),
  day('cramps', 'Crampes', 'Crampes musculaires', 'health'),
  day('sauna', 'Sauna', 'Session sauna', 'lifestyle'),
  day('intermittent_fasting', 'Jeûne intermittent', 'Fenêtre de jeûne respectée', 'lifestyle'),
  day('cold_shower', 'Douche froide', 'Exposition au froid', 'lifestyle'),
  day('cupping', 'Cupping', 'Ventouses / cupping', 'lifestyle'),
  day('cbd', 'CBD', 'Prise de CBD', 'lifestyle'),
  day('sun_exposure', 'Exposition au soleil', 'Temps significatif outdoors / soleil', 'lifestyle'),
  day('massage', 'Massage', 'Massage / thérapie manuelle', 'lifestyle'),
  day('mobility', 'Étirements / mobilité', 'Session mobilité', 'lifestyle'),
  day('meditation', 'Méditation', 'Pratique de méditation / respiration', 'lifestyle'),
  day('easy_walk', 'Marche légère', 'Marche de récupération', 'lifestyle'),
  day(
    'pneumatic_recovery',
    'Récupération pneumatique',
    'Normatec / bottes / compression',
    'lifestyle',
  ),
  day('added_sugar', 'Sucre ajouté', 'Sucres ajoutés consommés aujourd’hui', 'nutrition'),
  day('meal_out', 'Repas hors domicile', 'Repas à l’extérieur', 'behaviour'),
  day('skipped_meal', 'Repas sauté', 'Au moins un repas sauté', 'behaviour'),
  day('night_work', 'Travail de nuit', 'Horaires de nuit / décalage', 'behaviour'),
] as const;

const FACTOR_SET = new Set<string>(DAY_CONTEXT_FACTOR_IDS);

export function isDayContextFactorId(value: string): value is DayContextFactorId {
  return FACTOR_SET.has(value);
}

export function dayContextFactorById(id: DayContextFactorId): DayContextFactor | undefined {
  return DAY_CONTEXT_FACTORS.find((factor) => factor.id === id);
}

export function isPriorNightFactor(id: DayContextFactorId): boolean {
  return dayContextFactorById(id)?.window === 'prior_night';
}

export function factorsInGroup(group: DayContextFactorGroup): readonly DayContextFactor[] {
  return DAY_CONTEXT_FACTORS.filter((factor) => factor.group === group);
}

export function toggleDayContextFactor(
  selected: readonly DayContextFactorId[],
  id: DayContextFactorId,
): DayContextFactorId[] {
  if (selected.includes(id)) {
    return selected.filter((entry) => entry !== id);
  }
  return [...selected, id];
}

function formatFactorForAlgo(factor: DayContextFactor): string {
  if (factor.window === 'prior_night') {
    return `${factor.label} (nuit J-1→J)`;
  }
  return factor.label;
}

/** Encode selected factors into a notes suffix the coach / algo can read. */
export function formatDayContextFactorsNote(
  selected: readonly DayContextFactorId[],
): string | null {
  if (selected.length === 0) {
    return null;
  }
  const labels = DAY_CONTEXT_FACTORS.filter((factor) => selected.includes(factor.id)).map(
    formatFactorForAlgo,
  );
  return `Contexte : ${labels.join(' · ')}`;
}

export function mergeWellnessNotesWithFactors(
  notes: string | null | undefined,
  selected: readonly DayContextFactorId[],
): string | null {
  const factorLine = formatDayContextFactorsNote(selected);
  const trimmed = notes?.trim() || '';
  if (!factorLine && !trimmed) {
    return null;
  }
  if (!factorLine) {
    return trimmed;
  }
  if (!trimmed) {
    return factorLine;
  }
  return `${trimmed}\n${factorLine}`;
}
