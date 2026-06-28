/**
 * Configuration du Coach IA.
 *
 * On passe par le Vercel AI Gateway : un simple string "provider/model" est
 * routé automatiquement vers le gateway par l'AI SDK. L'auth se fait via la
 * variable d'environnement AI_GATEWAY_API_KEY (ou VERCEL_OIDC_TOKEN sur Vercel).
 */

/** Modèle principal (économique par défaut). */
export const COACH_MODEL = process.env.COACH_MODEL ?? "google/gemini-3-flash";

/**
 * Modèles de repli si le principal est indisponible.
 * Utilisés via providerOptions.gateway.models (failover géré par le gateway).
 */
export const COACH_FALLBACK_MODELS = [
  "anthropic/claude-haiku-4.5",
  "openai/gpt-5-mini",
];

/** Options gateway communes : failover + tag pour le suivi de coût. */
export const coachGatewayOptions = {
  gateway: {
    models: [...COACH_FALLBACK_MODELS],
    tags: ["feature:coach"],
  },
};

/** Indique si une clé d'accès au gateway est configurée. */
export function isCoachConfigured(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
  );
}
