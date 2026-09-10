import { IntegrationLogo } from '@/components/settings/integrations/logos';
import {
  DATA_CLASSES,
  providersForClass,
  type CatalogProvider,
} from '@/lib/integrations/provider-catalog';
import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonStatusBadge } from '@/components/ui/skeleton-patterns';

function IntegrationsHubShellHeader({ pending }: { pending: boolean }) {
  return (
    <div className="analysis-panel rounded-analysis-lg flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div>
        <p className="text-sm font-medium">Sources de données</p>
        {pending ? (
          <Skeleton className="mt-1 h-3 w-36 rounded-full border-0" />
        ) : (
          <p className="text-muted-foreground text-xs">
            État des connexions en cours de vérification…
          </p>
        )}
      </div>
      <Button disabled>Tout synchroniser</Button>
    </div>
  );
}

function IntegrationsHubProviderCard({
  provider,
  pending,
}: {
  provider: CatalogProvider;
  pending: boolean;
}) {
  return (
    <div className="analysis-panel rounded-analysis-lg flex w-full flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <IntegrationLogo
            className="size-10 shrink-0"
            id={provider.integrationId as IntegrationId}
          />
          <div>
            <p className="font-medium">{provider.name}</p>
            <p className="text-muted-foreground text-xs">{provider.tagline}</p>
          </div>
        </div>
        {pending ? <SkeletonStatusBadge /> : null}
      </div>
      {pending ? (
        <div className="mt-4">
          <Skeleton className="h-3 w-32 rounded-full border-0" />
        </div>
      ) : null}
    </div>
  );
}

function IntegrationsHubDataClassSection({
  dataClass,
  pending,
}: {
  dataClass: (typeof DATA_CLASSES)[number];
  pending: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">{dataClass.label}</h2>
        <p className="text-muted-foreground text-xs">{dataClass.description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {providersForClass(dataClass.id)
          .filter((p) => p.status === 'available' && p.integrationId)
          .map((provider) => (
            <IntegrationsHubProviderCard
              key={`${dataClass.id}-${provider.id}`}
              pending={pending}
              provider={provider}
            />
          ))}
      </div>
    </div>
  );
}

export function IntegrationsHubShell({ pending = false }: { pending?: boolean }) {
  return (
    <section className="space-y-6">
      <IntegrationsHubShellHeader pending={pending} />
      {DATA_CLASSES.map((dataClass) => (
        <IntegrationsHubDataClassSection
          key={dataClass.id}
          dataClass={dataClass}
          pending={pending}
        />
      ))}
    </section>
  );
}
