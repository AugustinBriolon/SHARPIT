/**
 * IN-PROCESS DOMAIN EVENT BUS
 *
 * Simple synchronous event bus that dispatches ObservationDomainEvents
 * to registered handlers within the same process.
 *
 * Used for Phase 5 (Strangler Fig) integration between the ObservationEngine
 * and the FeatureEngine. Both engines run in the same Next.js server process.
 *
 * For a future distributed architecture (multiple worker processes), this
 * can be replaced by a Redis pub/sub or Vercel Queues adapter that implements
 * the same DomainEventBus interface — the engines remain unchanged.
 */

import type { DomainEventBus, ObservationDomainEvent } from '@/core/observation/events';
import type { Observation } from '@/core/observation/types';
import type { FeatureEngine } from '@/core/features/engine';

type EventHandler = (event: ObservationDomainEvent) => void | Promise<void>;

export class InProcessEventBus implements DomainEventBus {
  private readonly handlers: EventHandler[] = [];

  subscribe(handler: EventHandler): void {
    this.handlers.push(handler);
  }

  async publish(event: ObservationDomainEvent): Promise<void> {
    // Dispatch to all handlers in parallel; failures are non-fatal
    const results = await Promise.allSettled(this.handlers.map((handler) => handler(event)));

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('[InProcessEventBus] Handler failed:', result.reason);
      }
    }
  }
}

/**
 * Create an InProcessEventBus pre-wired to the FeatureEngine.
 * The FeatureEngine only reacts to ObservationIngested events.
 */
export function createFeatureEngineBus(featureEng: FeatureEngine): InProcessEventBus {
  const bus = new InProcessEventBus();

  bus.subscribe(async (event) => {
    if (event.kind !== 'ObservationIngested') return;

    // We need the full Observation object. The event carries only the ID,
    // so the FeatureEngine's onObservationIngested is called via the ObservationEngine's
    // repository. However, to keep this simple in v1 and avoid an extra read,
    // we reconstruct a minimal Observation from the event for routing purposes.
    //
    // The FeatureEngine only uses: type, athleteId, trainingDayId, and id.
    // For SESSION type it then reads the full observation from the repository.
    const minimalObs = {
      id: event.observationId,
      athleteId: event.athleteId,
      type: event.type,
      trainingDayId: event.trainingDayId,
      quality: event.quality,
      qualityFlags: event.flags,
    } as Observation;

    await featureEng.onObservationIngested(minimalObs);
  });

  return bus;
}
