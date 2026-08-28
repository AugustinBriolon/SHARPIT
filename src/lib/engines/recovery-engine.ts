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
import type { WearableEnergySignals } from '@/core/inference/recovery/types';
import { PrismaDigitalTwinRepository } from '@/infrastructure/digital-twin/prisma-digital-twin-repository';
import { PrismaDecisionRecordRepository } from '@/infrastructure/inference/prisma-decision-record-repository';
import { featureEngine } from '@/lib/engines/feature-engine';
import { prisma } from '@/lib/prisma';

/** Legacy DailyHealth bridge. */
async function loadWearableEnergySignals(
  athleteId: string,
  trainingDayId: string,
): Promise<WearableEnergySignals | null> {
  const health = await prisma.dailyHealth.findUnique({
    where: {
      athleteId_date: { athleteId, date: new Date(`${trainingDayId}T00:00:00.000Z`) },
    },
    select: { stress: true, bodyBattery: true },
  });
  if (!health || ((health.stress === undefined || health.stress === null) && (health.bodyBattery === undefined || health.bodyBattery === null))) {
    return null;
  }
  return {
    stress: health.stress,
    bodyBattery: health.bodyBattery,
  };
}

function createRecoveryEngine(): RecoveryInferenceOrchestrator {
  const digitalTwinRepo = new PrismaDigitalTwinRepository(prisma);
  const decisionRecordRepo = new PrismaDecisionRecordRepository(prisma);

  return new RecoveryInferenceOrchestrator({
    featureEngine,
    digitalTwinRepo,
    decisionRecordRepo,
    getWearableEnergySignals: loadWearableEnergySignals,
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
