'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { CoachViewLayout } from '@/components/coach/coach-view-layout';
import { useCoachDiscussBootstrap } from '@/components/coach/use-coach-discuss-bootstrap';
import {
  useCoachConversationSelection,
  useCoachDiscussParams,
} from '@/components/coach/use-coach-conversation-selection';
import { useCoachViewChat } from '@/components/coach/use-coach-view-chat';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDeleteConversation, useRenameConversation } from '@/hooks/use-coach';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useIsMobile } from '@/hooks/use-viewport';
import { clearCoachInputDraft } from '@/lib/coach/chat/coach-input-draft';
import { warmCoachContext } from '@/lib/coach/warm-coach-context';
import { createClientId } from '@/lib/client-id';

function createEphemeralId(): string {
  return createClientId();
}

export function CoachView() {
  const online = useOnlineStatus();
  const { guardDisabled } = useOfflineGuard();
  const isMobile = useIsMobile();
  const [viewportReady, setViewportReady] = useState(false);
  const discussParams = useCoachDiscussParams();
  const selection = useCoachConversationSelection(discussParams.hasDiscussIntent, online);
  const { confirm, dialog } = useConfirmDialog();
  const renameConversation = useRenameConversation();
  const deleteConversation = useDeleteConversation();

  const { latchedContext, detachLatchedContext, createConversation } = useCoachDiscussBootstrap(
    discussParams,
    selection.setActiveId,
  );

  useLayoutEffect(() => {
    setViewportReady(true);
  }, []);

  useEffect(() => {
    if (!online) {
      return;
    }
    warmCoachContext();
  }, [online]);

  async function handleDeleteConversation(id: string) {
    const confirmed = await confirm({
      title: 'Supprimer cette conversation ?',
      description: 'Cette action supprime définitivement son historique.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    });
    if (!confirmed) {
      return;
    }
    deleteConversation.mutate(id);
    clearCoachInputDraft(id);
    if (selection.selectedId === id) {
      const nextId = createEphemeralId();
      selection.setEphemeralIds((prev) => new Set(prev).add(nextId));
      selection.setActiveId(nextId);
      detachLatchedContext();
    }
  }

  const { renderChat } = useCoachViewChat({
    online,
    hasNoLiveContent: selection.hasNoLiveContent,
    offlineEntry: selection.offlineEntry,
    selectedId: selection.selectedId,
    isEphemeral: selection.isEphemeral,
    latchedContext,
    autoReplyId: selection.autoReplyId,
    activeConversationPending: selection.activeConversation.isPending,
    activeConversationLoading: selection.activeConversation.isLoading,
    activeConversationData: selection.activeConversation.data
      ? { messages: selection.activeConversation.data.messages as unknown[] }
      : undefined,
    onAutoReplyStarted: () => selection.setAutoReplyId(null),
    onDetachContext: detachLatchedContext,
    onConversationCreated: selection.handleConversationCreated,
  });

  const mountLiveChat = viewportReady || (!isMobile && selection.isEphemeral);

  return (
    <CoachViewLayout
      conversations={selection.conversationsQuery.data ?? []}
      conversationsLoading={selection.conversationsQuery.isPending}
      dialog={dialog}
      isEphemeral={selection.isEphemeral}
      isMobile={isMobile}
      mountLiveChat={mountLiveChat}
      newDisabled={createConversation.isPending || guardDisabled}
      renderChat={renderChat}
      selectedId={selection.selectedId}
      viewportReady={viewportReady}
      onDelete={handleDeleteConversation}
      onNewConversation={() => selection.openNewConversation(detachLatchedContext)}
      onRename={(id, title) => renameConversation.mutate({ id, title })}
      onSelect={selection.setActiveId}
    />
  );
}
