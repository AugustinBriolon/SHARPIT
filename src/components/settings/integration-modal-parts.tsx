import Image from 'next/image';
import { Button } from '@/components/ui/button';

export function formatIntegrationLastSync(lastSyncAt: string | null | undefined): string {
  return lastSyncAt
    ? `Dernière sync : ${new Date(lastSyncAt).toLocaleString('fr-FR')}`
    : 'Jamais synchronisé';
}

export function IntegrationAccountCard({
  label,
  lastSyncAt,
  avatarUrl,
  avatarAlt = '',
}: {
  label: string | null | undefined;
  lastSyncAt: string | null | undefined;
  avatarUrl?: string;
  avatarAlt?: string;
}) {
  return (
    <div className="analysis-panel rounded-analysis-lg flex items-center gap-3 p-3">
      {avatarUrl && (
        <Image
          alt={avatarAlt}
          className="size-10 rounded-full object-cover"
          height={40}
          src={avatarUrl}
          width={40}
        />
      )}
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{formatIntegrationLastSync(lastSyncAt)}</p>
      </div>
    </div>
  );
}

export function IntegrationAccountSummary({
  label,
  lastSyncAt,
}: {
  label: string | null | undefined;
  lastSyncAt: string | null | undefined;
}) {
  return (
    <div className="analysis-panel rounded-analysis-lg p-3">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground text-xs">{formatIntegrationLastSync(lastSyncAt)}</p>
    </div>
  );
}

export function IntegrationSyncActions({
  syncing,
  onSync,
  onDisconnect,
  syncLabel = 'Synchroniser',
  syncingLabel = 'Sync…',
  syncDisabled,
  disconnectDisabled,
  importingAll,
  onFullImport,
  fullImportLabel = 'Tout l’historique',
  fullImportingLabel = 'Import…',
  children,
}: {
  syncing: boolean;
  onSync: () => void;
  onDisconnect: () => void;
  syncLabel?: string;
  syncingLabel?: string;
  syncDisabled?: boolean;
  disconnectDisabled?: boolean;
  importingAll?: boolean;
  onFullImport?: () => void;
  fullImportLabel?: string;
  fullImportingLabel?: string;
  children?: React.ReactNode;
}) {
  const busy = syncing || importingAll;

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      <Button disabled={busy || syncDisabled} onClick={onSync}>
        {syncing ? syncingLabel : syncLabel}
      </Button>
      {onFullImport && (
        <Button disabled={busy} variant="outline" onClick={onFullImport}>
          {importingAll ? fullImportingLabel : fullImportLabel}
        </Button>
      )}
      {children}
      <Button disabled={disconnectDisabled} variant="outline" onClick={onDisconnect}>
        Déconnecter
      </Button>
    </div>
  );
}
