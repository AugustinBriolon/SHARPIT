/**
 * Vocabulary layer for exercise matching (FR labels ↔ Garmin FR/EN catalog).
 *
 * Raw labels carry three kinds of tokens:
 * - concepts: what the movement IS (pont, gainage, fessier…) — drive the match
 * - qualifiers: how it is executed (excentrique, assis, brique…) — tiebreak only
 * - noise: grammar words — dropped
 *
 * Concepts are compared as canonical ids so a French prescription matches an
 * English Garmin leaf (`pont` → `bridge`, `gainage` → `plank`).
 */
import { exerciseTokens, normalizeExerciseKey } from '@/lib/exercises/normalize';

const STOPWORDS = new Set([
  'a',
  'au',
  'aux',
  'avec',
  'dans',
  'de',
  'des',
  'du',
  'en',
  'entre',
  'et',
  'la',
  'le',
  'les',
  'ma',
  'mon',
  'ou',
  'par',
  'pour',
  'sans',
  'sous',
  'sur',
  'un',
  'une',
  'terre',
  'type',
  'exercise',
  'exercises',
  'exercice',
  'position',
  'posture',
  'mouvement',
]);

/**
 * Execution modifiers. Present in a query they must never block a match;
 * matching them on the candidate only breaks ties.
 */
const QUALIFIERS = new Set([
  'alterne',
  'alternee',
  'alternees',
  'alternes',
  'assis',
  'assise',
  'allonge',
  'allongee',
  'body',
  'bilateral',
  'boule',
  'balle',
  'bandeau',
  'brique',
  'chaise',
  'concentrique',
  'controle',
  'debout',
  'couche',
  'couchee',
  'droit',
  'droite',
  'dynamique',
  'excentrique',
  'gauche',
  'isometrie',
  'isometrique',
  'lent',
  'lente',
  'mur',
  'pause',
  'sol',
  'statique',
  'tapis',
  'tempo',
  'unilateral',
  'unipodal',
]);

/**
 * Equipment concepts. A candidate demanding gear the athlete never mentioned
 * is demoted, so a bodyweight prescription does not resolve to a barbell leaf.
 */
export const EQUIPMENT_CONCEPTS = new Set([
  'barbell',
  'dumbbell',
  'kettlebell',
  'machine',
  'cable',
  'ball',
  'box',
  'sled',
  'rope',
  'suspension',
]);

/**
 * Body-target concepts. A prescription names the target on purpose
 * ("piriforme", "fessier"), so these outweigh action and tool words.
 */
export const ANATOMY_CONCEPTS = new Set([
  'piriformis',
  'thigh',
  'itband',
  'foot',
  'glute',
  'hamstring',
  'quad',
  'calf',
  'hip',
  'knee',
  'ankle',
  'shoulder',
  'back',
  'core',
  'adductor',
  'abductor',
  'psoas',
  'sciatic',
]);

/**
 * Synonym groups — first entry is the canonical id.
 * Mixes FR prescription wording with the FR labels and EN leaf names Garmin ships.
 */
const SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ['bridge', 'pont', 'ponts'],
  ['plank', 'planche', 'gainage', 'planches'],
  ['glute', 'glutes', 'fessier', 'fessiers', 'gluteal'],
  ['band', 'banded', 'elastique', 'elastiques', 'bande', 'bandes', 'miniband'],
  ['deadlift', 'souleve', 'souleves'],
  ['leg', 'legs', 'jambe', 'jambes'],
  ['straight', 'tendu', 'tendue', 'tendues', 'tendus'],
  ['stretch', 'etirement', 'etirements', 'etire', 'etirer', 'assouplissement'],
  ['massage', 'automassage', 'roller', 'foam', 'rouleau', 'relachement'],
  ['crunch', 'crunchs', 'abdominaux', 'abdos', 'abdominal', 'abs'],
  ['core', 'ceinture', 'tronc'],
  ['hip', 'hips', 'hanche', 'hanches', 'bassin'],
  ['knee', 'genou', 'knees'],
  ['ankle', 'cheville', 'chevilles'],
  ['shoulder', 'shoulders', 'epaule', 'epaules', 'deltoide', 'deltoides'],
  ['back', 'dos', 'lombaire', 'lombaires'],
  ['hamstring', 'hamstrings', 'ischio', 'ischios', 'ischiojambiers'],
  ['quad', 'quads', 'quadriceps'],
  ['thigh', 'cuisse', 'cuisses'],
  ['itband', 'bandelette', 'iliotibiale', 'iliotibial'],
  ['foot', 'pied', 'pieds', 'plantaire', 'voute'],
  ['calf', 'calves', 'mollet', 'mollets'],
  ['adductor', 'adducteur', 'adducteurs'],
  ['abductor', 'abducteur', 'abducteurs'],
  ['squat', 'squats'],
  ['lunge', 'lunges', 'fente', 'fentes'],
  ['pushup', 'pompe', 'pompes'],
  ['pullup', 'traction', 'tractions', 'chinup'],
  ['row', 'rowing', 'tirage', 'tirages'],
  ['press', 'developpe', 'developpes'],
  ['raise', 'releve', 'releves', 'elevation', 'elevations', 'lever', 'levers'],
  ['curl', 'flexion', 'flexions'],
  ['extension', 'extensions'],
  ['rotation', 'rotations', 'rotational', 'rotatif'],
  ['external', 'externe', 'externes'],
  ['internal', 'interne', 'internes'],
  ['lateral', 'laterale', 'laterales', 'lateraux', 'side'],
  ['clamshell', 'clamshells', 'clam', 'palourde', 'coquille'],
  ['piriformis', 'piriforme', 'piriformes'],
  ['sciatic', 'sciatique', 'nerve', 'nerf', 'flossing'],
  ['hollow', 'creuse', 'creuser'],
  ['tilt', 'bascule', 'retroversion', 'antéversion', 'anteversion'],
  ['deadbug', 'bug'],
  ['bird', 'chien'],
  ['walk', 'walks', 'marche', 'marches'],
  ['hold', 'maintien', 'tenue'],
  ['jump', 'saut', 'sauts', 'jumps'],
  ['step', 'steps', 'montee', 'montees'],
  ['twist', 'torsion', 'torsions'],
  ['psoas', 'flechisseur', 'flechisseurs', 'iliopsoas'],
  ['mobility', 'mobilite', 'mobilisation'],
  ['warmup', 'echauffement', 'activation'],
  ['barbell', 'barre'],
  ['dumbbell', 'haltere', 'halteres'],
  ['kettlebell'],
  ['machine', 'poulie', 'cable'],
  ['ball', 'ballon', 'swiss', 'medecine'],
  ['suspension', 'trx', 'sangle', 'sangles'],
];

const CANONICAL_BY_TOKEN: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const group of SYNONYM_GROUPS) {
    const [canonical] = group;
    for (const token of group) map.set(token, canonical);
  }
  return map;
})();

/** Merge multi-word movement names the tokenizer would otherwise split. */
const BIGRAM_MERGES: readonly (readonly [string, string])[] = [
  ['push up', 'pushup'],
  ['pull up', 'pullup'],
  ['chin up', 'chinup'],
  ['sit up', 'situp'],
  ['dead bug', 'deadbug'],
  ['foam roller', 'foam'],
  ['auto massage', 'automassage'],
  ['clam shell', 'clamshell'],
  ['clam shells', 'clamshell'],
  ['nerve flossing', 'sciatique'],
  ['hollow body', 'hollow'],
];

export function canonicalConcept(token: string): string {
  return CANONICAL_BY_TOKEN.get(token) ?? token;
}

function mergeBigrams(key: string): string {
  let out = key;
  for (const [from, to] of BIGRAM_MERGES) out = out.split(from).join(to);
  return out;
}

function dedupe(ids: string[]): string[] {
  return [...new Set(ids)];
}

export type ExercisePhrase = {
  /** Discriminating concept ids, head first. */
  concepts: string[];
  /** Execution modifiers — bonus signal only. */
  qualifiers: string[];
};

/**
 * Split a free-text exercise label into concepts and qualifiers.
 * Parenthesised content is always demoted to qualifiers: `(Excentrique)`,
 * `(Brique entre les genoux)` describe execution, not the movement.
 */
export function parseExercisePhrase(raw: string): ExercisePhrase {
  const parenthesised: string[] = [];
  const withoutParens = raw.replace(/\(([^)]*)\)/g, (_, inner: string) => {
    parenthesised.push(inner);
    return ' ';
  });

  const mainTokens = exerciseTokens(mergeBigrams(normalizeExerciseKey(withoutParens)));
  const parenTokens = parenthesised.flatMap((chunk) =>
    exerciseTokens(mergeBigrams(normalizeExerciseKey(chunk))),
  );

  const concepts: string[] = [];
  const qualifiers: string[] = [];

  for (const token of mainTokens) {
    if (STOPWORDS.has(token)) continue;
    const id = canonicalConcept(token);
    if (QUALIFIERS.has(token) || QUALIFIERS.has(id)) qualifiers.push(id);
    else concepts.push(id);
  }
  for (const token of parenTokens) {
    if (STOPWORDS.has(token)) continue;
    qualifiers.push(canonicalConcept(token));
  }

  return { concepts: dedupe(concepts), qualifiers: dedupe(qualifiers) };
}

/** Concept ids of a catalog entry (label + enum leaf merged). */
export function phraseConcepts(...parts: string[]): string[] {
  const merged = parts.filter(Boolean).join(' ');
  const { concepts } = parseExercisePhrase(merged);
  return concepts;
}
