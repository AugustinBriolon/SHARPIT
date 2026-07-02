/**
 * Developer Platform — Singleton instances
 *
 * Wires the DevPlatform components to the production repositories.
 * All dev tools are gated by DEV_TOOLS_ENABLED=true.
 *
 * These are internal engineering tools — never exposed to end users.
 */

import { PrismaObservationRepository } from '@/infrastructure/observation/prisma-observation-repository';
import { PrismaFeatureRepository } from '@/infrastructure/features/prisma-feature-repository';
import { AthleteContextProvider } from '@/infrastructure/features/athlete-context-provider';
import { ReplayEngine } from '@/core/dev/replay-engine';
import { PipelineInspector } from '@/core/dev/pipeline-inspector';
import { FeatureExplorer } from '@/core/dev/feature-explorer';
import { globalMetrics } from '@/core/dev/metrics';
import { prisma } from '@/lib/prisma';

export const isDevToolsEnabled =
  process.env.DEV_TOOLS_ENABLED === 'true' || process.env.NODE_ENV === 'development';

function createDevTools() {
  const obsRepo = new PrismaObservationRepository(prisma);
  const featureRepo = new PrismaFeatureRepository(prisma);
  const contextProvider = new AthleteContextProvider(prisma);

  return {
    replayEngine: new ReplayEngine(obsRepo, featureRepo, contextProvider),
    pipelineInspector: new PipelineInspector(obsRepo, featureRepo),
    featureExplorer: new FeatureExplorer(featureRepo),
    metrics: globalMetrics,
  };
}

// Lazy singleton — created only when first accessed and only if enabled
let _devTools: ReturnType<typeof createDevTools> | null = null;

export function getDevTools() {
  if (!isDevToolsEnabled) {
    throw new Error('Developer tools are disabled. Set DEV_TOOLS_ENABLED=true to enable them.');
  }
  if (!_devTools) {
    _devTools = createDevTools();
  }
  return _devTools;
}
