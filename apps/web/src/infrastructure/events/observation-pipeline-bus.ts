import type { DomainEventBus } from '@/core/observation/events';
import { FeatureEngine } from '@/core/features';
import {
  createFeatureEngineBus,
  InProcessEventBus,
} from '@/infrastructure/events/in-process-event-bus';

/**
 * Observation pipeline bus: FeatureEngine + future AthleteState handlers.
 * Feature extraction is enabled unless FEATURE_ENGINE_ENABLED=false.
 */
export function createObservationPipelineBus(featureEng: FeatureEngine): DomainEventBus {
  const bus = new InProcessEventBus();

  if (process.env.FEATURE_ENGINE_ENABLED !== 'false') {
    const featureBus = createFeatureEngineBus(featureEng);
    bus.subscribe((event) => featureBus.publish(event));
  }

  return bus;
}
