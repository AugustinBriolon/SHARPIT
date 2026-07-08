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
 *   import { featureEngine } from '@/lib/engines/feature-engine'
 *   await featureEngine.getDayFeatures(athleteId, trainingDayId)
 */

import { FeatureEngine } from '@/core/features';
import { PrismaFeatureRepository } from '@/infrastructure/features/prisma-feature-repository';
import { AthleteContextProvider } from '@/infrastructure/features/athlete-context-provider';
import { PrismaSessionStreamProvider } from '@/infrastructure/features/prisma-session-stream-provider';
import { PrismaObservationRepository } from '@/infrastructure/observation/prisma-observation-repository';
import { prisma } from '@/lib/prisma';

const globalForFeatureEngine = globalThis as unknown as {
  featureEngine: FeatureEngine | undefined;
};

function createFeatureEngine(): FeatureEngine {
  const featureRepository = new PrismaFeatureRepository(prisma);
  const observationRepository = new PrismaObservationRepository(prisma);
  const contextProvider = new AthleteContextProvider(prisma);
  const sessionStreamProvider = new PrismaSessionStreamProvider(prisma);

  return new FeatureEngine({
    featureRepository,
    observationRepository,
    contextProvider,
    sessionStreamProvider,
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
