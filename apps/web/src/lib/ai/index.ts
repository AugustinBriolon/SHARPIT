/**
 * Configuration du Coach IA.
 *
 * On passe par le Vercel AI Gateway : un simple string "provider/model" est
 * routé automatiquement vers le gateway par l'AI SDK. L'auth se fait via la
 * variable d'environnement AI_GATEWAY_API_KEY (ou VERCEL_OIDC_TOKEN sur Vercel).
 */

/** Modèle principal (économique par défaut). */
export const COACH_MODEL = process.env.COACH_MODEL ?? 'google/gemini-3-flash';

/**
 * Modèles de repli si le principal est indisponible.
 * Utilisés via providerOptions.gateway.models (failover géré par le gateway).
 */
export const COACH_FALLBACK_MODELS = ['anthropic/claude-haiku-4.5', 'openai/gpt-5-mini'];

/**
 * Profondeur de réflexion, par type de charge de travail.
 *
 * Les modèles Flash de Gemini 3 sont à `high` par défaut : mesuré sur
 * `/api/coach/adapt`, cela produisait 16 197 caractères de raisonnement pour
 * 14 ajustements, et une génération de 68 s.
 *
 * Les deux paliers diffèrent parce que les charges de travail diffèrent :
 * - `structured` (plan, adapt) : le modèle doit produire un objet conforme à un
 *   schéma. Mesuré, `low` casse cette contrainte — réponse invalide, zéro
 *   ajustement. `medium` est le plancher praticable.
 * - `conversational` (chat) : texte libre et appels d'outils, aucun schéma à
 *   respecter. C'est aussi le chemin interactif, celui où l'athlète attend.
 *
 * Option de haut niveau volontairement : elle s'applique aussi aux modèles de
 * repli (Anthropic, OpenAI), alors que `providerOptions.google` ne vaudrait que
 * lorsque Google sert la requête.
 */
export const COACH_REASONING_LEVEL = {
  conversational: 'low',
  structured: 'medium',
} as const;

/**
 * Plafond de sortie — conversationnel uniquement.
 *
 * Sur un modèle à raisonnement, ce plafond couvre la réflexion ET la réponse.
 * Appliqué au chemin structuré (plan, adapt), le modèle épuisait son budget en
 * délibérant et le JSON n'arrivait jamais au bout : mesuré à 32 433 puis 40 068
 * caractères de raisonnement pour zéro ajustement et une sortie invalide.
 *
 * Le chemin conversationnel n'a pas ce risque — un texte tronqué reste lisible,
 * là où un objet tronqué est simplement rejeté. On ne borne donc que celui-là,
 * et le coût du chemin structuré est tenu par `reasoning: 'medium'`.
 */
export const COACH_MAX_OUTPUT_TOKENS = {
  conversational: 8_000,
} as const;

/**
 * `includeThoughts: false` — le résumé de raisonnement coûtait des tokens de
 * sortie pour un contenu que l'athlète ne lisait pas vraiment (juste un signal
 * "ça travaille"). Contrepartie assumée : le premier contenu remonte à nouveau
 * en ~14 s au lieu de ~3 s ; l'UI affiche un simple indicateur de réflexion
 * (`CoachReasoning`) pendant cette attente plutôt que le résumé.
 */
const googleThinkingOptions = {
  google: { thinkingConfig: { includeThoughts: false } },
};

/**
 * Mise en cache du préfixe de prompt.
 *
 * Chaque requête chat renvoie ~6 000 tokens identiques : prompt système,
 * contexte athlète et schémas des 9 outils. Ce préfixe est identique d'un tour
 * à l'autre d'une conversation, et repart à chaque étape d'un tour à outils.
 * Le cache le facture une fraction du prix plein, sans rien changer à la réponse.
 *
 * Pas de `has: ['implicit-caching']` ici : ce filtre restreint le routage aux
 * fournisseurs annonçant la capacité, et l'ajouter a fait basculer /adapt sur un
 * autre modèle — raisonnement doublé (32 433 caractères) et sortie structurée
 * invalide. `caching: 'auto'` seul active le cache là où il existe sans toucher
 * au choix du modèle.
 */
const gatewayCaching = {
  caching: 'auto',
};

/** Options du chat : failover + cache + tag pour le suivi de coût. */
export const coachGatewayOptions = {
  ...googleThinkingOptions,
  gateway: {
    ...gatewayCaching,
    models: [...COACH_FALLBACK_MODELS],
    tags: ['feature:coach'],
  },
};

/**
 * Options du chemin structuré (plan, adapt) — volontairement SANS cache.
 *
 * Ces routes envoient un prompt différent à chaque appel (fenêtre de dates,
 * séances du moment) : il n'y a quasiment pas de préfixe à réutiliser, donc rien
 * à gagner. Elles sont par ailleurs sensibles à l'adhérence au schéma, et on
 * garde ce chemin sur la configuration exactement connue comme fonctionnelle.
 */
export const coachStructuredGatewayOptions = {
  ...googleThinkingOptions,
  gateway: {
    models: [...COACH_FALLBACK_MODELS],
    tags: ['feature:coach'],
  },
};

/** Same model as chat; separate tag for structured analyses (narrative, compliance). */
export const coachAnalysisGatewayOptions = {
  ...googleThinkingOptions,
  gateway: {
    ...gatewayCaching,
    models: [...COACH_FALLBACK_MODELS],
    tags: ['feature:analysis'],
  },
};

/** Indique si une clé d'accès au gateway est configurée. */
export function isCoachConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
}
