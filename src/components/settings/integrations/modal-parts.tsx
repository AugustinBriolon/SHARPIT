import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { guardedActionLabel, useOfflineGuard } from '@/hooks/use-offline-guard';
import { motionTokens } from '@/lib/motion/tokens';

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
  children?: ReactNode;
}) {
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
  const busy = syncing || importingAll;

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      <Button disabled={busy || syncDisabled || guardDisabled} onClick={onSync}>
        {guardedActionLabel(offline, offlineLabel, syncLabel, {
          active: syncing,
          label: syncingLabel,
        })}
      </Button>
      {onFullImport && (
        <Button disabled={busy || guardDisabled} variant="outline" onClick={onFullImport}>
          {guardedActionLabel(offline, offlineLabel, fullImportLabel, {
            active: importingAll ?? false,
            label: fullImportingLabel,
          })}
        </Button>
      )}
      {children}
      <Button disabled={disconnectDisabled} variant="outline" onClick={onDisconnect}>
        Déconnecter
      </Button>
    </div>
  );
}

/**
 * In-modal manage ↔ disconnect confirm — crossfade + slide, no stacked Dialog.
 */
export function IntegrationManageStage({
  stage,
  confirmTitle,
  confirmDescription,
  confirmingLabel = 'Déconnexion…',
  confirmLabel = 'Déconnecter',
  cancelLabel = 'Annuler',
  onCancelConfirm,
  onConfirmDisconnect,
  disconnecting = false,
  children,
}: {
  stage: 'manage' | 'confirm';
  confirmTitle: string;
  confirmDescription?: string;
  confirmingLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onCancelConfirm: () => void;
  onConfirmDisconnect: () => void | Promise<void>;
  disconnecting?: boolean;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const offset = reduceMotion ? 0 : motionTokens.distance.md;
  const duration = reduceMotion ? 0 : motionTokens.duration.normal;

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence initial={false} mode="wait">
        {stage === 'manage' ? (
          <motion.div
            key="manage"
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
            exit={{ opacity: 0, x: -offset }}
            initial={{ opacity: 0, x: -offset }}
            transition={{ duration, ease: motionTokens.easing.smooth }}
          >
            {children}
          </motion.div>
        ) : (
          <motion.div
            key="confirm"
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
            exit={{ opacity: 0, x: offset }}
            initial={{ opacity: 0, x: offset }}
            transition={{ duration, ease: motionTokens.easing.smooth }}
          >
            <div className="space-y-2">
              <p className="text-foreground text-sm font-medium">{confirmTitle}</p>
              {confirmDescription ? (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {confirmDescription}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button disabled={disconnecting} variant="outline" onClick={onCancelConfirm}>
                {cancelLabel}
              </Button>
              <Button
                disabled={disconnecting}
                variant="destructive"
                onClick={() => void onConfirmDisconnect()}
              >
                {disconnecting ? confirmingLabel : confirmLabel}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
