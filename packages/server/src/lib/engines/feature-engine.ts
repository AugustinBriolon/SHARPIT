/**
 * FEATURE ENGINE — Singleton
 *
 * Wires the FeatureEngine with its infrastructure dependencies and provides
 * a process-level singleton, following the same pattern as observation-engine.ts.
 *
 * Feature flag: FEATURE_ENGINE_ENABLED
 *   - 'true'  → FeatureEngine subscribes to ObservationIngested events
 *   - absent  → FeatureEngine is created but not subscribed (legacy pipeline only)
 *
 * This flag allows gradual validation before full migration.
 * See INFERENCE_ARCHITECTURE_REVIEW.md §12.4 — Migration from existing UI read paths.
 *
 * Usage:
 *   import { featureEngine } from '@sharpit/server/lib/engines/feature-engine'
 *   await featureEngine.getDayFeatures(athleteId, trainingDayId)
 */

import { FeatureEngine } from '@sharpit/core/features';
import { PrismaFeatureRepository } from '@sharpit/server/infrastructure/features/prisma-feature-repository';
import { AthleteContextProvider } from '@sharpit/server/infrastructure/features/athlete-context-provider';
import { PrismaSessionStreamProvider } from '@sharpit/server/infrastructure/features/prisma-session-stream-provider';
import { PrismaObservationRepository } from '@sharpit/server/infrastructure/observation/prisma-observation-repository';
import { PrismaConditionRepository } from '@sharpit/server/infrastructure/physical-health/prisma-condition-repository';
import { prisma } from '@sharpit/db/client';

const globalForFeatureEngine = globalThis as unknown as {
  featureEngine: FeatureEngine | undefined;
};

/**
 * Read-only access to stored features, for callers that need the persisted values
 * without the engine's repair-on-read behaviour.
 */
export const featureRepository = new PrismaFeatureRepository(prisma);

function createFeatureEngine(): FeatureEngine {
  const observationRepository = new PrismaObservationRepository(prisma);
  const contextProvider = new AthleteContextProvider(prisma);
  const sessionStreamProvider = new PrismaSessionStreamProvider(prisma);

  return new FeatureEngine({
    featureRepository,
    observationRepository,
    contextProvider,
    sessionStreamProvider,
    conditionRepository: new PrismaConditionRepository(prisma),
  });
}

export const featureEngine = globalForFeatureEngine.featureEngine ?? createFeatureEngine();

if (process.env.NODE_ENV !== 'production') {
  globalForFeatureEngine.featureEngine = featureEngine;
}

/**
 * Feature Engine event subscription.
 * Disabled only when FEATURE_ENGINE_ENABLED=false (opt-out).
 */
export const isFeatureEngineEnabled = process.env.FEATURE_ENGINE_ENABLED !== 'false';
