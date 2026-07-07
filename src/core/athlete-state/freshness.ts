/**
 * Freshness — first-class domain concept for athlete state visibility.
 *
 * Technical pipeline states are translated to product-facing messages elsewhere.
 */

export type AthleteStateDomain =
  'recovery' | 'training' | 'sleep' | 'body' | 'reasoning' | 'recommendations' | 'planning';

export type FreshnessLevel =
  'fresh' | 'stale' | 'awaiting_data' | 'syncing' | 'computing' | 'unavailable';

export type DomainFreshness = {
  domain: AthleteStateDomain;
  lastUpdatedAt: string | null;
  freshness: FreshnessLevel;
  /** Internal diagnostic — never shown raw to athletes */
  state: string;
  /** Athlete-facing message when not fresh */
  productMessage: string | null;
};

export type ProviderFreshness = {
  provider: string;
  connected: boolean;
  lastSyncAt: string | null;
  stale: boolean;
  syncing: boolean;
};

export type AthleteFreshnessSnapshot = {
  athleteId: string;
  trainingDayId: string;
  computedAt: string;
  domains: DomainFreshness[];
  providers: ProviderFreshness[];
  overallFresh: boolean;
  primaryProductMessage: string | null;
};

export const ALL_ATHLETE_STATE_DOMAINS: readonly AthleteStateDomain[] = [
  'recovery',
  'training',
  'sleep',
  'body',
  'reasoning',
  'recommendations',
  'planning',
] as const;
