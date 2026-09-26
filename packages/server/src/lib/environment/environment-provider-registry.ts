/**
 * Production environmental provider registry.
 */

import { openMeteoEnvironmentalAdapter } from '@sharpit/server/adapters/environment/open-meteo-adapter';
import { manualEnvironmentalAdapter } from '@sharpit/server/adapters/environment/manual-adapter';
import type { EnvironmentalProviderRegistry } from '@sharpit/core/environment/provider';
import { createOpenMeteoEnvironmentalProvider } from '@sharpit/server/infrastructure/environment/open-meteo-provider';
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
