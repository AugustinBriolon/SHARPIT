/**
 * RECOVERY INTELLIGENCE — Singleton
 *
 * Wires the production infrastructure to the Recovery Inference Orchestrator.
 * All production dependencies are injected here.
 *
 * Usage:
 *   import { recoveryEngine } from '@/lib/engines/recovery-engine'
 *   const result = await recoveryEngine.run(athleteId, trainingDayId)
 */

import { RecoveryInferenceOrchestrator } from '@/core/inference/orchestrator';
import { PrismaDigitalTwinRepository } from '@/infrastructure/digital-twin/prisma-digital-twin-repository';
import { PrismaDecisionRecordRepository } from '@/infrastructure/inference/prisma-decision-record-repository';
import { featureEngine } from '@/lib/engines/feature-engine';
import { prisma } from '@/lib/prisma';

function createRecoveryEngine(): RecoveryInferenceOrchestrator {
  const digitalTwinRepo = new PrismaDigitalTwinRepository(prisma);
  const decisionRecordRepo = new PrismaDecisionRecordRepository(prisma);

  return new RecoveryInferenceOrchestrator({
    featureEngine,
    digitalTwinRepo,
    decisionRecordRepo,
  });
}

let _recoveryEngine: RecoveryInferenceOrchestrator | null = null;

export function getRecoveryEngine(): RecoveryInferenceOrchestrator {
  if (!_recoveryEngine) {
    _recoveryEngine = createRecoveryEngine();
  }
  return _recoveryEngine;
}

// Named export for convenience
export const recoveryEngine = {
  run: (athleteId: string, trainingDayId: string) =>
    getRecoveryEngine().run(athleteId, trainingDayId),
  getLatest: (athleteId: string, trainingDayId: string) =>
    getRecoveryEngine().getLatest(athleteId, trainingDayId),
};
