import type { UIMessage } from 'ai';
import { reasoningTextOf } from '@/lib/coach/chat/coach-reasoning';
import type { ToolPartLite } from '@/lib/coach/chat/coach-tool-parts';

export type CoachMappedUserRow = {
  kind: 'user';
  key: string;
  text: string;
  /** Live streaming tail — skip content-visibility. */
  live: boolean;
};

export type CoachMappedAssistantRow = {
  kind: 'assistant';
  key: string;
  text: string;
  reasoning: string;
  toolParts: ToolPartLite[];
  live: boolean;
  showProvenance: boolean;
  /** Empty assistant turn with no live tail — omit from transcript. */
  skip: boolean;
};

export type CoachMappedRow = CoachMappedUserRow | CoachMappedAssistantRow;

export type MapCoachMessagesInput = {
  messages: UIMessage[];
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  lastAssistantIndex: number;
};

function textOf(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => (p as { text: string }).text)
    .join('');
}

function toolPartsOf(message: UIMessage): ToolPartLite[] {
  return message.parts.filter((p) => p.type.startsWith('tool-')) as ToolPartLite[];
}

export function mapCoachMessages({
  messages,
  status,
  lastAssistantIndex,
}: MapCoachMessagesInput): CoachMappedRow[] {
  const rows: CoachMappedRow[] = [];

  messages.forEach((message, messageIndex) => {
    const rowKey = `${message.id}:${messageIndex}`;
    const isUser = message.role === 'user';
    const text = textOf(message);
    const isLiveStreamTail =
      status === 'streaming' && messageIndex === messages.length - 1 && !isUser;

    if (isUser) {
      rows.push({ kind: 'user', key: rowKey, text, live: isLiveStreamTail });
      return;
    }

    const toolParts = toolPartsOf(message);
    const reasoning = reasoningTextOf(message.parts);
    const inlineParts = toolParts.filter((p) => p.state !== 'approval-requested');
    const hasApprovalPendingOnMessage = toolParts.some((p) => p.state === 'approval-requested');
    const skip =
      !text &&
      !reasoning &&
      inlineParts.length === 0 &&
      !hasApprovalPendingOnMessage &&
      !isLiveStreamTail;

    rows.push({
      kind: 'assistant',
      key: rowKey,
      text,
      reasoning,
      toolParts: inlineParts,
      live: isLiveStreamTail,
      showProvenance: messageIndex === lastAssistantIndex && Boolean(text) && status === 'ready',
      skip,
    });
  });

  return rows;
}

export function collectPendingApprovals(messages: UIMessage[]): ToolPartLite[] {
  const pending: ToolPartLite[] = [];
  for (const message of messages) {
    if (message.role !== 'assistant') continue;
    for (const part of message.parts) {
      if (!part.type.startsWith('tool-')) continue;
      const lite = part as ToolPartLite;
      if (lite.state === 'approval-requested' && lite.approval && !lite.approval.isAutomatic) {
        pending.push(lite);
      }
    }
  }
  return pending;
}

export function showSubmittedPlaceholder(
  status: MapCoachMessagesInput['status'],
  messages: UIMessage[],
): boolean {
  if (status !== 'submitted' || messages.length === 0) return false;
  return messages[messages.length - 1]?.role === 'user';
}
