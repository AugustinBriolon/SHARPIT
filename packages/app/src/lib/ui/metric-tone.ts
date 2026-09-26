export type MetricTone = 'good' | 'warn' | 'bad' | 'neutral';

/**
 * Statut de lecture santé / composition (page Biology).
 * Distinct de MetricTone (entraînement) et des signaux --chart-* (intensité d'effort).
 *
 * - ok        : dans la plage attendue — valeur en neutre, pas d'alerte
 * - watch     : écart modéré ou dérive récente — ambre mesuré
 * - verify    : variation 7j peu plausible — inviter à vérifier la mesure, pas un signal santé
 * - attention : écart net — signal fort, sobre, à utiliser avec parcimonie
 * - neutral   : statut non déterminable (pas de repère ni comparaison)
 */
export type CorpsTone = 'ok' | 'watch' | 'verify' | 'attention' | 'neutral';

export const METRIC_TONE_CLASS: Record<MetricTone, string> = {
  good: 'text-primary',
  warn: 'text-signal-caution',
  bad: 'text-signal-risk',
  neutral: 'text-foreground',
};

/** Couleur de la valeur affichée sur les cartes composition. */
export const CORPS_TONE_TEXT: Record<CorpsTone, string> = {
  ok: 'text-foreground',
  watch: 'text-health-status-watch',
  verify: 'text-health-status-verify',
  attention: 'text-health-status-attention',
  neutral: 'text-foreground',
};

/** Pastille d'accompagnement (repère discret, pas la valeur elle-même). */
export const CORPS_TONE_DOT: Record<CorpsTone, string> = {
  ok: 'bg-health-status-ok',
  watch: 'bg-health-status-watch',
  verify: 'bg-health-status-verify',
  attention: 'bg-health-status-attention',
  neutral: 'bg-muted-foreground/40',
};

/** Fond des segments d'échelle dans l'explainer composition. */
export const CORPS_TONE_SCALE: Record<CorpsTone, string> = {
  ok: 'bg-health-status-ok/35',
  watch: 'bg-health-status-watch/75',
  verify: 'bg-health-status-verify/70',
  attention: 'bg-health-status-attention/80',
  neutral: 'bg-muted-foreground/30',
};

/** Badge de zone dans l'explainer composition. */
export const CORPS_TONE_BADGE: Record<CorpsTone, string> = {
  ok: 'bg-muted text-foreground',
  watch: 'bg-health-status-watch/12 text-health-status-watch',
  verify: 'bg-health-status-verify/12 text-health-status-verify',
  attention: 'bg-health-status-attention/12 text-health-status-attention',
  neutral: 'bg-muted text-muted-foreground',
};

export function metricToneClass(tone: MetricTone): string {
  return METRIC_TONE_CLASS[tone];
}

export function corpsToneTextClass(tone: CorpsTone): string {
  return CORPS_TONE_TEXT[tone];
}
