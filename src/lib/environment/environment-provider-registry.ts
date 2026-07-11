/**
 * Production environmental provider registry.
 */

import { openMeteoEnvironmentalAdapter } from '@/core/adapters/environment/open-meteo-adapter';
import { manualEnvironmentalAdapter } from '@/core/adapters/environment/manual-adapter';
import type { EnvironmentalProviderRegistry } from '@/core/environment/provider';
import { createOpenMeteoEnvironmentalProvider } from '@/infrastructure/environment/open-meteo-provider';
import { randomUUID } from 'node:crypto';

export function createEnvironmentalProviderRegistry(): EnvironmentalProviderRegistry {
  return {
    providers: [createOpenMeteoEnvironmentalProvider()],
    adapters: new Map([
      ['open-meteo', openMeteoEnvironmentalAdapter],
      ['manual', manualEnvironmentalAdapter],
    ]),
    createObservationId: () => randomUUID(),
  };
}
