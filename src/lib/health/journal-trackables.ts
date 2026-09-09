/**
 * Built-in journal trackables — stable IDs for longitudinal collection.
 *
 * Intent: athletes opt into sparse day signals now so later presentation-layer
 * analytics can correlate practices/consumption with recovery, sleep, and form.
 * Do not rename IDs once shipped. Custom items use `custom_*` ids in the same
 * AthleteDayJournal.factors JSON bag.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Battery,
  BedDouble,
  Bone,
  Brain,
  Cigarette,
  CloudRain,
  Coffee,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Hand,
  HeartPulse,
  Leaf,
  Moon,
  PersonStanding,
  Pill,
  Salad,
  Smile,
  Snowflake,
  Sun,
  Thermometer,
  Utensils,
  Wine,
  Zap,
  Monitor,
  UtensilsCrossed,
  CircleDot,
  Sparkles,
  Waves,
  CircleAlert,
} from 'lucide-react';

/** Filter chips in the personalize drawer. */
export const JOURNAL_FILTER_IDS = [
  'all',
  'automatique',
  'sante',
  'style_vie',
  'comportement',
  'bien_etre',
  'personnalise',
] as const;

export type JournalFilterId = (typeof JOURNAL_FILTER_IDS)[number];

export const JOURNAL_FILTER_LABELS: Record<JournalFilterId, string> = {
  all: 'Tous',
  automatique: 'Automatique',
  sante: 'État de santé',
  style_vie: 'Style de vie',
  comportement: 'Comportement',
  bien_etre: 'Bien-être',
  personnalise: 'Personnalisé',
};

export type JournalTrackableKind =
  | 'auto'
  | 'factor'
  | 'metric_caffeine'
  | 'metric_mood'
  | 'metric_hydration'
  | 'nutrition_panel'
  | 'diet';

export type JournalTrackableCategory = Exclude<JournalFilterId, 'all' | 'personnalise'>;

export type JournalBuiltinTrackableId =
  | 'metric_caffeine'
  | 'metric_mood'
  | 'metric_hydration'
  | 'late_meal'
  | 'device_in_bed'
  | 'steps_10k'
  | 'stress_ok'
  | 'nap'
  | 'sun'
  | 'cardio_20'
  | 'strength_20'
  | 'sleep_target'
  | 'body_battery_ok'
  | 'hydration_sync'
  | 'outdoor_minutes'
  | 'nutrition_panel'
  | 'added_sugar'
  | 'alcohol'
  | 'fever'
  | 'menstruation'
  | 'tobacco'
  | 'headache'
  | 'pain'
  | 'allergies'
  | 'cold_congestion'
  | 'cramps'
  | 'sauna'
  | 'intermittent_fasting'
  | 'cold_shower'
  | 'cupping'
  | 'cbd'
  | 'sun_exposure'
  | 'massage'
  | 'mobility'
  | 'meditation'
  | 'easy_walk'
  | 'pneumatic_recovery'
  | 'meal_out'
  | 'skipped_meal'
  | 'night_work'
  | 'omega3'
  | 'creatine'
  | 'vitamin_d'
  | 'magnesium'
  | 'ashwagandha'
  | 'multivitamin'
  | 'zinc'
  | 'probiotic'
  | 'electrolytes'
  | 'collagen'
  | 'protein_powder'
  | 'hydration_quality'
  | 'diet_gluten_free'
  | 'diet_keto'
  | 'diet_dairy_free'
  | 'diet_vegetarian'
  | 'diet_vegan';

export type JournalBuiltinTrackable = {
  id: JournalBuiltinTrackableId;
  label: string;
  category: JournalTrackableCategory;
  kind: JournalTrackableKind;
  icon: LucideIcon;
  factorId?: string;
  autoId?: string;
  dietId?: string;
};

function auto(
  id: JournalBuiltinTrackableId,
  label: string,
  icon: LucideIcon,
  autoId: string,
): JournalBuiltinTrackable {
  return { id, label, category: 'automatique', kind: 'auto', icon, autoId };
}

type FactorTrackableInput = {
  id: JournalBuiltinTrackableId;
  label: string;
  category: JournalTrackableCategory;
  icon: LucideIcon;
  factorId?: string;
};

function factor(input: FactorTrackableInput): JournalBuiltinTrackable {
  const { id, label, category, icon, factorId = id } = input;
  return { id, label, category, kind: 'factor', icon, factorId };
}

export const JOURNAL_BUILTIN_TRACKABLES: readonly JournalBuiltinTrackable[] = [
  // Bien-être — metrics / nutrition
  {
    id: 'metric_caffeine',
    label: 'Caféine',
    category: 'bien_etre',
    kind: 'metric_caffeine',
    icon: Coffee,
  },
  {
    id: 'metric_mood',
    label: 'Humeur',
    category: 'bien_etre',
    kind: 'metric_mood',
    icon: Smile,
  },
  {
    id: 'metric_hydration',
    label: 'Hydratation',
    category: 'bien_etre',
    kind: 'metric_hydration',
    icon: Droplets,
  },
  {
    id: 'nutrition_panel',
    label: 'Nutrition (lecture)',
    category: 'bien_etre',
    kind: 'nutrition_panel',
    icon: Salad,
  },

  // Automatique
  auto('steps_10k', 'Pas (objectif)', Footprints, 'steps_10k'),
  auto('stress_ok', 'Stress sous cible', HeartPulse, 'stress_ok'),
  auto('nap', 'Sieste', Moon, 'nap'),
  auto('sun', 'Soleil (auto)', Sun, 'sun'),
  auto('cardio_20', 'Cardio ≥ 20 min', Activity, 'cardio_20'),
  auto('strength_20', 'Force ≥ 20 min', Dumbbell, 'strength_20'),
  auto('sleep_target', 'Sommeil ≥ cible', BedDouble, 'sleep_target'),
  auto('body_battery_ok', 'Body Battery', Battery, 'body_battery_ok'),
  auto('hydration_sync', 'Hydratation (sync)', Droplets, 'hydration_sync'),
  auto('outdoor_minutes', 'Temps outdoor', Sun, 'outdoor_minutes'),

  // Comportement
  factor({
    id: 'late_meal',
    label: 'Repas tardif',
    category: 'comportement',
    icon: UtensilsCrossed,
  }),
  factor({ id: 'device_in_bed', label: 'Écran au lit', category: 'comportement', icon: Monitor }),
  factor({ id: 'alcohol', label: 'Alcool', category: 'comportement', icon: Wine }),
  factor({ id: 'added_sugar', label: 'Sucre ajouté', category: 'comportement', icon: Flame }),
  factor({
    id: 'meal_out',
    label: 'Repas hors domicile',
    category: 'comportement',
    icon: Utensils,
  }),
  factor({
    id: 'skipped_meal',
    label: 'Repas sauté',
    category: 'comportement',
    icon: UtensilsCrossed,
  }),
  factor({ id: 'night_work', label: 'Travail de nuit', category: 'comportement', icon: Moon }),

  // État de santé
  factor({ id: 'fever', label: 'Fièvre', category: 'sante', icon: Thermometer }),
  factor({ id: 'menstruation', label: 'Menstruation', category: 'sante', icon: CircleDot }),
  factor({ id: 'tobacco', label: 'Tabac', category: 'sante', icon: Cigarette }),
  factor({ id: 'headache', label: 'Maux de tête', category: 'sante', icon: CircleAlert }),
  factor({ id: 'pain', label: 'Douleur', category: 'sante', icon: Bone }),
  factor({ id: 'allergies', label: 'Allergies', category: 'sante', icon: CloudRain }),
  factor({
    id: 'cold_congestion',
    label: 'Rhume / congestion',
    category: 'sante',
    icon: CloudRain,
  }),
  factor({ id: 'cramps', label: 'Crampes', category: 'sante', icon: Zap }),

  // Style de vie
  factor({ id: 'sauna', label: 'Sauna', category: 'style_vie', icon: Flame }),
  factor({
    id: 'intermittent_fasting',
    label: 'Jeûne intermittent',
    category: 'style_vie',
    icon: Zap,
  }),
  factor({ id: 'cold_shower', label: 'Douche froide', category: 'style_vie', icon: Snowflake }),
  factor({ id: 'cupping', label: 'Cupping', category: 'style_vie', icon: Bone }),
  factor({ id: 'cbd', label: 'CBD', category: 'style_vie', icon: Leaf }),
  factor({ id: 'sun_exposure', label: 'Exposition au soleil', category: 'style_vie', icon: Sun }),
  factor({ id: 'massage', label: 'Massage', category: 'style_vie', icon: Hand }),
  factor({
    id: 'mobility',
    label: 'Étirements / mobilité',
    category: 'style_vie',
    icon: PersonStanding,
  }),
  factor({ id: 'meditation', label: 'Méditation', category: 'style_vie', icon: Brain }),
  factor({ id: 'easy_walk', label: 'Marche légère', category: 'style_vie', icon: Footprints }),
  factor({
    id: 'pneumatic_recovery',
    label: 'Récupération pneumatique',
    category: 'style_vie',
    icon: Waves,
  }),

  // Bien-être — supplements / recovery aids
  factor({ id: 'omega3', label: 'Oméga-3', category: 'bien_etre', icon: Pill }),
  factor({ id: 'creatine', label: 'Créatine', category: 'bien_etre', icon: Pill }),
  factor({ id: 'vitamin_d', label: 'Vitamine D', category: 'bien_etre', icon: Pill }),
  factor({ id: 'magnesium', label: 'Magnésium', category: 'bien_etre', icon: Pill }),
  factor({ id: 'ashwagandha', label: 'Ashwagandha', category: 'bien_etre', icon: Pill }),
  factor({ id: 'multivitamin', label: 'Multivitamines', category: 'bien_etre', icon: Pill }),
  factor({ id: 'zinc', label: 'Zinc', category: 'bien_etre', icon: Pill }),
  factor({ id: 'probiotic', label: 'Probiotique', category: 'bien_etre', icon: Pill }),
  factor({ id: 'electrolytes', label: 'Électrolytes', category: 'bien_etre', icon: Droplets }),
  factor({ id: 'collagen', label: 'Collagène', category: 'bien_etre', icon: Pill }),
  factor({ id: 'protein_powder', label: 'Protéine en poudre', category: 'bien_etre', icon: Pill }),
  factor({
    id: 'hydration_quality',
    label: 'Bonne hydratation (ressenti)',
    category: 'bien_etre',
    icon: Droplets,
  }),

  // Diets (profile context)
  {
    id: 'diet_gluten_free',
    label: 'Sans gluten',
    category: 'bien_etre',
    kind: 'diet',
    icon: Salad,
    dietId: 'gluten_free',
  },
  {
    id: 'diet_keto',
    label: 'Cétogène',
    category: 'bien_etre',
    kind: 'diet',
    icon: Salad,
    dietId: 'keto',
  },
  {
    id: 'diet_dairy_free',
    label: 'Sans produits laitiers',
    category: 'bien_etre',
    kind: 'diet',
    icon: Salad,
    dietId: 'dairy_free',
  },
  {
    id: 'diet_vegetarian',
    label: 'Végétarien',
    category: 'bien_etre',
    kind: 'diet',
    icon: Salad,
    dietId: 'vegetarian',
  },
  {
    id: 'diet_vegan',
    label: 'Végétalien',
    category: 'bien_etre',
    kind: 'diet',
    icon: Salad,
    dietId: 'vegan',
  },
] as const;

export const JOURNAL_BUILTIN_TRACKABLE_IDS = JOURNAL_BUILTIN_TRACKABLES.map(
  (item) => item.id,
) as JournalBuiltinTrackableId[];

const BY_ID = new Map(JOURNAL_BUILTIN_TRACKABLES.map((item) => [item.id, item]));

export function journalTrackableById(id: string): JournalBuiltinTrackable | undefined {
  return BY_ID.get(id as JournalBuiltinTrackableId);
}

export function isCustomTrackableId(id: string): boolean {
  return /^custom_[a-zA-Z0-9_-]{4,64}$/.test(id);
}

export function createCustomTrackableId(): string {
  const suffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `custom_${suffix}`;
}

export const CUSTOM_FACTOR_ICON = Sparkles;
