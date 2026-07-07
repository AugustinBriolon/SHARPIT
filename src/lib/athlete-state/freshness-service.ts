import { format } from 'date-fns';
import type {
  AthleteFreshnessSnapshot,
  AthleteStateDomain,
  DomainFreshness,
  FreshnessLevel,
  ProviderFreshness,
} from '@/core/athlete-state/freshness';
import { prisma } from '@/lib/prisma';
import {
  pickPrimaryProductMessage,
  productMessageForDomain,
} from '@/lib/athlete-state/product-states';

const ATHLETE_ID = 'default';

type TwinState = { computedAt?: string | Date } | null;

function readComputedAt(state: unknown): Date | null {
  if (!state || typeof state !== 'object') return null;
  const raw = (state as TwinState)?.computedAt;
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isStale(computed: Date | null, evidence: Date | null): boolean {
  if (!evidence) return false;
  if (!computed) return true;
  return evidence > computed;
}

function hoursSince(date: Date | null): number | null {
  if (!date) return null;
  return (Date.now() - date.getTime()) / 3_600_000;
}

function providerStale(lastSync: Date | null, thresholdHours: number): boolean {
  if (!lastSync) return true;
  return hoursSince(lastSync)! > thresholdHours;
}

type ComputingFlags = Partial<Record<AthleteStateDomain, boolean>>;
type SyncingFlags = Partial<Record<string, boolean>>;

export async function computeFreshnessSnapshot(params: {
  trainingDayId: string;
  athleteId?: string;
  computing?: ComputingFlags;
  syncing?: SyncingFlags;
}): Promise<AthleteFreshnessSnapshot> {
  const athleteId = params.athleteId ?? ATHLETE_ID;
  const { trainingDayId } = params;
  const computing = params.computing ?? {};
  const syncing = params.syncing ?? {};

  const [
    twin,
    latestSleep,
    latestSession,
    latestSubjective,
    latestBody,
    strava,
    garmin,
    renpho,
    withings,
    google,
    briefing,
  ] = await Promise.all([
    prisma.digitalTwin.findUnique({ where: { athleteId } }),
    prisma.observation.findFirst({
      where: { athleteId, type: 'SLEEP', trainingDayId },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    }),
    prisma.observation.findFirst({
      where: { athleteId, type: 'SESSION', trainingDayId },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    }),
    prisma.observation.findFirst({
      where: { athleteId, type: 'SUBJECTIVE', trainingDayId, source: 'MANUAL' },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    }),
    prisma.observation.findFirst({
      where: { athleteId, type: 'BODY_COMPOSITION' },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    }),
    prisma.stravaAccount.findUnique({ where: { id: 'default' }, select: { lastSyncAt: true } }),
    prisma.garminAccount.findUnique({
      where: { id: 'default' },
      select: { lastSyncAt: true, lastActivitySyncAt: true },
    }),
    prisma.renphoAccount.findUnique({ where: { id: 'default' }, select: { lastSyncAt: true } }),
    prisma.withingsAccount.findUnique({ where: { id: 'default' }, select: { lastSyncAt: true } }),
    prisma.googleAccount.findUnique({ where: { id: 'default' }, select: { lastSyncAt: true } }),
    prisma.dailyBriefing.findFirst({
      where: { date: new Date(`${trainingDayId}T12:00:00.000Z`) },
      select: { generatedAt: true },
    }),
  ]);

  const recoveryAt = readComputedAt(twin?.recoveryState);
  const fatigueAt = readComputedAt(twin?.fatigueState);
  const adaptationAt = readComputedAt(twin?.adaptationState);
  const reasoningAt = readComputedAt(twin?.reasoningState);

  const sleepEvidence = latestSleep?.timestamp ?? null;
  const sessionEvidence = latestSession?.timestamp ?? null;
  const subjectiveEvidence = latestSubjective?.timestamp ?? null;
  const bodyEvidence = latestBody?.timestamp ?? null;

  const providers: ProviderFreshness[] = [
    {
      provider: 'garmin',
      connected: garmin != null,
      lastSyncAt: garmin?.lastSyncAt?.toISOString() ?? null,
      stale: garmin != null && providerStale(garmin.lastSyncAt, 6),
      syncing: syncing.garmin === true,
    },
    {
      provider: 'strava',
      connected: strava != null,
      lastSyncAt: strava?.lastSyncAt?.toISOString() ?? null,
      stale: strava != null && providerStale(strava.lastSyncAt, 6),
      syncing: syncing.strava === true,
    },
    {
      provider: 'renpho',
      connected: renpho != null,
      lastSyncAt: renpho?.lastSyncAt?.toISOString() ?? null,
      stale: renpho != null && providerStale(renpho.lastSyncAt, 24),
      syncing: syncing.renpho === true,
    },
    {
      provider: 'withings',
      connected: withings != null,
      lastSyncAt: withings?.lastSyncAt?.toISOString() ?? null,
      stale: withings != null && providerStale(withings.lastSyncAt, 24),
      syncing: syncing.withings === true,
    },
    {
      provider: 'google',
      connected: google != null,
      lastSyncAt: google?.lastSyncAt?.toISOString() ?? null,
      stale: google != null && providerStale(google.lastSyncAt, 12),
      syncing: syncing.google === true,
    },
  ];

  const morningWindow = new Date();
  const expectSleep = morningWindow.getHours() < 14;

  function domain(
    domainName: AthleteStateDomain,
    lastUpdatedAt: Date | null,
    freshness: FreshnessLevel,
    state: string,
  ): DomainFreshness {
    return {
      domain: domainName,
      lastUpdatedAt: lastUpdatedAt?.toISOString() ?? null,
      freshness: computing[domainName] ? 'computing' : freshness,
      state,
      productMessage: productMessageForDomain(
        domainName,
        computing[domainName] ? 'computing' : freshness,
      ),
    };
  }

  const sleepFreshness: FreshnessLevel = syncing.garmin
    ? 'syncing'
    : expectSleep && !sleepEvidence
      ? 'awaiting_data'
      : isStale(recoveryAt, sleepEvidence)
        ? 'stale'
        : recoveryAt
          ? 'fresh'
          : 'awaiting_data';

  const recoveryFreshness: FreshnessLevel =
    computing.recovery || syncing.garmin
      ? computing.recovery
        ? 'computing'
        : 'syncing'
      : !recoveryAt
        ? 'unavailable'
        : isStale(recoveryAt, sleepEvidence) || isStale(recoveryAt, subjectiveEvidence)
          ? 'stale'
          : 'fresh';

  const trainingFreshness: FreshnessLevel =
    computing.training || syncing.garmin || syncing.strava
      ? computing.training
        ? 'computing'
        : 'syncing'
      : isStale(fatigueAt, sessionEvidence)
        ? 'stale'
        : fatigueAt
          ? 'fresh'
          : 'awaiting_data';

  const reasoningFreshness: FreshnessLevel = computing.reasoning
    ? 'computing'
    : !reasoningAt
      ? 'unavailable'
      : isStale(reasoningAt, recoveryAt) ||
          isStale(reasoningAt, fatigueAt) ||
          isStale(reasoningAt, adaptationAt)
        ? 'stale'
        : 'fresh';

  const briefingAt = briefing?.generatedAt ?? null;
  const recommendationsFreshness: FreshnessLevel = computing.recommendations
    ? 'computing'
    : !briefingAt
      ? 'awaiting_data'
      : reasoningAt && briefingAt < reasoningAt
        ? 'stale'
        : sessionEvidence && briefingAt < sessionEvidence
          ? 'stale'
          : 'fresh';

  const bodyFreshness: FreshnessLevel =
    syncing.renpho || syncing.withings
      ? 'syncing'
      : !renpho && !withings
        ? 'unavailable'
        : bodyEvidence && hoursSince(bodyEvidence)! < 24 * 14
          ? 'fresh'
          : 'awaiting_data';

  const planningFreshness: FreshnessLevel = syncing.google
    ? 'syncing'
    : google?.lastSyncAt
      ? 'fresh'
      : 'awaiting_data';

  const domains: DomainFreshness[] = [
    domain('sleep', recoveryAt, sleepFreshness, `sleep_obs=${sleepEvidence != null}`),
    domain('recovery', recoveryAt, recoveryFreshness, `recovery_computed=${recoveryAt != null}`),
    domain('training', fatigueAt, trainingFreshness, `fatigue_computed=${fatigueAt != null}`),
    domain('body', bodyEvidence, bodyFreshness, `body_obs=${bodyEvidence != null}`),
    domain(
      'reasoning',
      reasoningAt,
      reasoningFreshness,
      `reasoning_computed=${reasoningAt != null}`,
    ),
    domain(
      'recommendations',
      briefingAt,
      recommendationsFreshness,
      `briefing=${briefingAt != null}`,
    ),
    domain(
      'planning',
      google?.lastSyncAt ?? null,
      planningFreshness,
      `google_sync=${google != null}`,
    ),
  ];

  const productMessages = domains.map((d) => d.productMessage);
  const overallFresh = domains.every(
    (d) => d.freshness === 'fresh' || d.freshness === 'unavailable',
  );

  return {
    athleteId,
    trainingDayId,
    computedAt: new Date().toISOString(),
    domains,
    providers,
    overallFresh,
    primaryProductMessage: pickPrimaryProductMessage(productMessages),
  };
}

export function providersNeedingSync(
  snapshot: AthleteFreshnessSnapshot,
  options?: { force?: boolean },
): string[] {
  if (options?.force) {
    return snapshot.providers.filter((p) => p.connected).map((p) => p.provider);
  }

  const hour = new Date().getHours();
  const needs: string[] = [];

  for (const p of snapshot.providers) {
    if (!p.connected || p.syncing) continue;
    if (!p.stale) continue;
    if (p.provider === 'garmin' || p.provider === 'strava') {
      needs.push(p.provider);
    }
    if ((p.provider === 'renpho' || p.provider === 'withings') && hour >= 6) {
      needs.push(p.provider);
    }
    if (p.provider === 'google' && hour >= 7) {
      needs.push(p.provider);
    }
  }

  return [...new Set(needs)];
}

export function trainingDayIdNow(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function shouldSyncOnOpen(snapshot: AthleteFreshnessSnapshot): boolean {
  const hour = new Date().getHours();
  if (hour < 5) return false;
  if (!snapshot.overallFresh) return true;
  return snapshot.providers.some((p) => p.connected && p.stale);
}
