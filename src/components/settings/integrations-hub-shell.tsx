import { IntegrationLogo } from '@/components/settings/integration-logos';
import { INTEGRATION_CATALOG } from '@/components/settings/integrations-types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonStatusBadge } from '@/components/ui/skeleton-patterns';

export function IntegrationsHubShell({ pending = false }: { pending?: boolean }) {
  return (
    <section className="space-y-4">
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

      <div className="grid gap-3 sm:grid-cols-2">
        {INTEGRATION_CATALOG.map((integration) => (
          <div
            key={integration.id}
            className="analysis-panel rounded-analysis-lg flex w-full flex-col p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <IntegrationLogo className="size-10 shrink-0" id={integration.id} />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{integration.name}</p>
                    {integration.badge === 'legacy' ? (
                      <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium uppercase">
                        Historique
                      </span>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground text-xs">{integration.tagline}</p>
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
        ))}
      </div>
    </section>
  );
}
