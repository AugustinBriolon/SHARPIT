/**
 * Singleton ObservationEngine bound to the Prisma client.
 *
 * Mirrors the pattern of src/lib/prisma.ts: one engine instance per process,
 * reused across hot-reloads in development.
 *
 * Feature flag: FEATURE_ENGINE_ENABLED
 *   When set to 'true', the ObservationEngine is connected to the FeatureEngine
 *   via an InProcessEventBus. This activates the Strangler Fig integration.
 *   See src/lib/feature-engine.ts and INFERENCE_ARCHITECTURE_REVIEW.md §12.4.
 *
 * Usage:
 *   import { observationEngine } from '@/lib/engines/observation-engine'
 *   await observationEngine.ingest(athleteId, rawObservation)
 */

import { ObservationEngine } from '@/core/observation';
import { PrismaObservationRepository } from '@/infrastructure/observation/prisma-observation-repository';
import { createObservationPipelineBus } from '@/infrastructure/events/observation-pipeline-bus';
import { prisma } from '@/lib/prisma';
import { featureEngine } from '@/lib/engines/feature-engine';

const globalForEngine = globalThis as unknown as {
  observationEngine: ObservationEngine | undefined;
};

function createEngine(): ObservationEngine {
  const repository = new PrismaObservationRepository(prisma);
  const eventBus = createObservationPipelineBus(featureEngine);
  return new ObservationEngine({ repository, eventBus });
}

export const observationEngine = globalForEngine.observationEngine ?? createEngine();

if (process.env.NODE_ENV !== 'production') {
  globalForEngine.observationEngine = observationEngine;
}
