'use client';

import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePlannedSessionNavDismiss } from '@/components/planning/session/planned-session-nav-dismiss';
import { useAppModalOptional } from '@/providers/app-modal-provider';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { PlannedSessionReadActionsMenuContent } from '@/components/planning/session/read/planned-session-read-actions-menu-content';

export type PlannedSessionHeaderActions = {
  onEdit: () => void;
  sessionId: string;
  /** Linked realized activity — opens activity detail. */
  activityId?: string | null;
  onDelink?: () => void;
  delinkPending?: boolean;
  onReanalyze?: () => void;
  reanalyzeDisabled?: boolean;
  isAnalyzing?: boolean;
  hasAnalysis?: boolean;
};

function useModalDismissNavigation() {
  const dismissFromDialog = usePlannedSessionNavDismiss();
  const appModal = useAppModalOptional();

  return () => {
    dismissFromDialog?.();
    appModal?.closePlannedSession();
  };
}

/**
 * Session modal overflow — edit, recompute, coach, linked activity.
 * Short labels: Recalculer / Analyser instead of long conformité copy.
 */
export function PlannedSessionReadActionsMenu(props: PlannedSessionHeaderActions) {
  const closeModalThenNavigate = useModalDismissNavigation();
  const { offline, offlineLabel } = useOfflineGuard();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Actions de la séance"
            className="shrink-0"
            size="icon-xs"
            type="button"
            variant="outline"
          />
        }
      >
        <MoreHorizontal className="size-3.5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <PlannedSessionReadActionsMenuContent
          actions={props}
          offline={offline}
          offlineLabel={offlineLabel}
          onNavigate={closeModalThenNavigate}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
