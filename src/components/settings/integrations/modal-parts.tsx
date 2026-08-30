import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { guardedActionLabel, useOfflineGuard } from '@/hooks/use-offline-guard';
import { useIsDemoMode } from '@/hooks/use-is-demo-mode';
import { motionTokens } from '@/lib/motion/tokens';
import { cn } from '@/lib/utils';
import {
  integrationConnectBody,
  integrationConnectCta,
  type IntegrationDefinition,
} from '@/components/settings/integrations/types';
import { IntegrationLogo } from '@/components/settings/integrations/logos';

export function formatIntegrationLastSync(lastSyncAt: string | null | undefined): string {
  return lastSyncAt
    ? `Dernière sync : ${new Date(lastSyncAt).toLocaleString('fr-FR')}`
    : 'Jamais synchronisé';
}

export function IntegrationStatusMessage({
  message,
  assertive = false,
}: {
  message?: string;
  assertive?: boolean;
}) {
  if (!message) {
    return null;
  }
  return (
    <p
      aria-live={assertive ? 'assertive' : 'polite'}
      className={assertive ? 'text-destructive text-sm' : 'text-muted-foreground text-sm'}
    >
      {message}
    </p>
  );
}

export function IntegrationNotConfiguredView({
  integration,
  children,
}: {
  integration: IntegrationDefinition;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <IntegrationModalHeader integration={integration} />
      <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export function IntegrationNotConnectedView({
  integration,
  body,
  connectHref,
  lanHint,
}: {
  integration: IntegrationDefinition;
  body: string;
  connectHref: string;
  lanHint?: string;
}) {
  const isDemo = useIsDemoMode();

  return (
    <div className="space-y-4">
      <IntegrationModalHeader integration={integration} />
      <p className="text-muted-foreground text-sm leading-relaxed">
        {integrationConnectBody(integration, body)}
      </p>
      {lanHint ? (
        <p className="border-signal-caution/30 bg-signal-caution/10 text-signal-caution rounded-lg border px-3 py-2 text-sm leading-relaxed">
          {lanHint}
        </p>
      ) : null}
      {isDemo ? (
        <p className="text-muted-foreground bg-muted rounded-lg px-3 py-2 text-sm leading-relaxed">
          Connexion disponible avec un compte personnel — désactivée sur le compte démo partagé.
        </p>
      ) : (
        <a className={cn(buttonVariants(), 'w-full sm:w-auto')} href={connectHref}>
          {integrationConnectCta(integration)}
        </a>
      )}
      <IntegrationStatusMessage message={integration.statusMessage} assertive />
    </div>
  );
}

function IntegrationModalHeader({ integration }: { integration: IntegrationDefinition }) {
  return (
    <div className="flex items-start gap-3">
      <IntegrationLogo className="size-11 shrink-0" id={integration.id} />
      <div className="flex flex-wrap gap-1.5 pt-1">
        {integration.dataTypes.map((tag) => (
          <span
            key={tag}
            className="bg-muted/80 text-muted-foreground text-label rounded-full px-2 py-0.5"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function IntegrationFullImportButton({
  busy,
  guardDisabled,
  offline,
  offlineLabel,
  importingAll,
  onFullImport,
  fullImportLabel,
  fullImportingLabel,
}: {
  busy: boolean;
  guardDisabled: boolean;
  offline: boolean;
  offlineLabel: string;
  importingAll?: boolean;
  onFullImport: () => void;
  fullImportLabel: string;
  fullImportingLabel: string;
}) {
  return (
    <Button disabled={busy || guardDisabled} variant="outline" onClick={onFullImport}>
      {guardedActionLabel(offline, offlineLabel, fullImportLabel, {
        active: importingAll ?? false,
        label: fullImportingLabel,
      })}
    </Button>
  );
}

function IntegrationConfirmStage({
  confirmTitle,
  confirmDescription,
  confirmingLabel,
  confirmLabel,
  cancelLabel,
  disconnecting,
  onCancelConfirm,
  onConfirmDisconnect,
  offset,
  duration,
}: {
  confirmTitle: string;
  confirmDescription?: string;
  confirmingLabel: string;
  confirmLabel: string;
  cancelLabel: string;
  disconnecting: boolean;
  onCancelConfirm: () => void;
  onConfirmDisconnect: () => void | Promise<void>;
  offset: number;
  duration: number;
}) {
  return (
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
          <p className="text-muted-foreground text-sm leading-relaxed">{confirmDescription}</p>
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
  );
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

function IntegrationSyncButton({
  busy,
  syncDisabled,
  guardDisabled,
  offline,
  offlineLabel,
  syncing,
  syncLabel,
  syncingLabel,
  onSync,
}: {
  busy: boolean;
  syncDisabled?: boolean;
  guardDisabled: boolean;
  offline: boolean;
  offlineLabel: string;
  syncing: boolean;
  syncLabel: string;
  syncingLabel: string;
  onSync: () => void;
}) {
  return (
    <Button disabled={busy || syncDisabled || guardDisabled} onClick={onSync}>
      {guardedActionLabel(offline, offlineLabel, syncLabel, {
        active: syncing,
        label: syncingLabel,
      })}
    </Button>
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
  const busy = Boolean(syncing || importingAll);

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      <IntegrationSyncButton
        busy={busy}
        guardDisabled={guardDisabled}
        offline={offline}
        offlineLabel={offlineLabel}
        syncDisabled={syncDisabled}
        syncing={syncing}
        syncingLabel={syncingLabel}
        syncLabel={syncLabel}
        onSync={onSync}
      />
      {onFullImport ? (
        <IntegrationFullImportButton
          busy={busy}
          fullImportingLabel={fullImportingLabel}
          fullImportLabel={fullImportLabel}
          guardDisabled={guardDisabled}
          importingAll={importingAll}
          offline={offline}
          offlineLabel={offlineLabel}
          onFullImport={onFullImport}
        />
      ) : null}
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
          <IntegrationConfirmStage
            cancelLabel={cancelLabel}
            confirmDescription={confirmDescription}
            confirmingLabel={confirmingLabel}
            confirmLabel={confirmLabel}
            confirmTitle={confirmTitle}
            disconnecting={disconnecting}
            duration={duration}
            offset={offset}
            onCancelConfirm={onCancelConfirm}
            onConfirmDisconnect={onConfirmDisconnect}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
