import { IntegrationLogo } from '@/components/settings/integrations/logos';

export function ConnectGarminHeader({ title, lead }: { title: string; lead?: string }) {
  return (
    <header className="flex flex-col items-center gap-3 text-center">
      <IntegrationLogo className="size-12" id="garmin" />
      <div className="space-y-1">
        <h1 className="text-page-title">{title}</h1>
        {lead ? <p className="text-muted-foreground text-sm text-pretty">{lead}</p> : null}
      </div>
    </header>
  );
}
