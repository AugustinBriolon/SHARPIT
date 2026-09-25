import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { DATA_CLASSES, type DataClassId } from '@/lib/integrations/provider-catalog';
import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import { catalogIntegrationIds } from '@/lib/integrations/source-prefs';
import {
  disableProviderForClass,
  enableProviderForClass,
  setPrimaryForClass,
  type IntegrationSourcePrefs,
} from '@/lib/integrations/source-prefs';
import {
  loadConnectedIntegrationIds,
  loadResolvedSourcePrefs,
  persistSourcePrefsMutation,
} from '@/lib/integrations/source-prefs-store';

const dataClassSchema = z.enum(DATA_CLASSES.map((c) => c.id) as [DataClassId, ...DataClassId[]]);

const integrationIdSchema = z.enum(catalogIntegrationIds() as [IntegrationId, ...IntegrationId[]]);

const patchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('enable'),
    dataClass: dataClassSchema,
    provider: integrationIdSchema,
  }),
  z.object({
    action: z.literal('disable'),
    dataClass: dataClassSchema,
    provider: integrationIdSchema,
  }),
  z.object({
    action: z.literal('setPrimary'),
    dataClass: dataClassSchema,
    provider: integrationIdSchema,
  }),
]);

export async function GET() {
  try {
    const athleteId = await getCurrentAthleteId();
    const [prefs, connected] = await Promise.all([
      loadResolvedSourcePrefs(athleteId),
      loadConnectedIntegrationIds(athleteId),
    ]);
    return NextResponse.json({ prefs, connected });
  } catch (error) {
    console.error('[source-prefs GET]', error);
    return NextResponse.json({ error: 'Impossible de charger les préférences' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
  }

  try {
    const athleteId = await getCurrentAthleteId();
    const connected = await loadConnectedIntegrationIds(athleteId);
    const { action, dataClass, provider } = parsed.data;

    if (!connected.includes(provider as IntegrationId) && action !== 'disable') {
      return NextResponse.json(
        { error: 'Connecte d’abord ce compte avant de l’activer pour cette classe' },
        { status: 400 },
      );
    }

    const prefs = await persistSourcePrefsMutation(athleteId, (current) => {
      switch (action) {
        case 'enable':
          return enableProviderForClass(current, dataClass, provider);
        case 'disable':
          return disableProviderForClass(current, dataClass, provider);
        case 'setPrimary':
          return setPrimaryForClass(current, dataClass, provider);
        default:
          return current;
      }
    });

    return NextResponse.json({ prefs } satisfies { prefs: IntegrationSourcePrefs });
  } catch (error) {
    console.error('[source-prefs PATCH]', error);
    return NextResponse.json(
      { error: 'Impossible de mettre à jour les préférences' },
      { status: 500 },
    );
  }
}
