'use client';

import { useCallback, useMemo } from 'react';
import { renderCoachChat } from '@/components/coach/coach-view-chat';
import type { CoachDiscussContext } from '@/lib/coach/chat/coach-discuss-context';
import type { PersistedSnapshotEntry } from '@/lib/pwa/snapshot-store-validation';

type UseCoachViewChatOptions = {
  online: boolean;
  hasNoLiveContent: boolean;
  offlineEntry: PersistedSnapshotEntry | null;
  selectedId: string | null;
  isEphemeral: boolean;
  latchedContext: CoachDiscussContext | null;
  autoReplyId: string | null;
  activeConversationPending: boolean;
  activeConversationLoading: boolean;
  activeConversationData: { messages: unknown[] } | null | undefined;
  onAutoReplyStarted: () => void;
  onDetachContext: () => void;
  onConversationCreated: (id: string) => void;
};

export function useCoachViewChat(options: UseCoachViewChatOptions) {
  const renderChat = useCallback(
    (header?: React.ReactNode) => renderCoachChat({ ...options, header }),
    [options],
  );

  return useMemo(() => ({ renderChat }), [renderChat]);
}
