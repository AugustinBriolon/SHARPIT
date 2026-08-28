import type { ClientConversationSummary } from '@/lib/query/fetchers';

export function conversationListIsDraft(
  activeDraft: boolean,
  loading: boolean,
  activeId: string | null,
  conversations: ClientConversationSummary[],
): boolean {
  if (activeDraft) {
    return true;
  }
  if (loading) {
    return false;
  }
  return Boolean(activeId && !conversations.some((c) => c.id === activeId));
}

export function conversationListSelectedId(
  isDraft: boolean,
  activeId: string | null,
  conversations: ClientConversationSummary[],
): string {
  if (isDraft) {
    return '';
  }
  return activeId ?? conversations[0]?.id ?? '';
}

export function conversationListSelected(
  isDraft: boolean,
  conversations: ClientConversationSummary[],
  selectedId: string,
): ClientConversationSummary | undefined {
  if (isDraft) {
    return undefined;
  }
  return conversations.find((c) => c.id === selectedId);
}
