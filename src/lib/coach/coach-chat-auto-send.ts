import { isToolUIPart, type UIMessage } from 'ai';

/**
 * Fingerprint of approval-responded tool parts in the last assistant step.
 * Used to prevent `sendAutomaticallyWhen` from re-firing forever when those
 * parts stay stuck as `approval-responded` after a failed/empty continuation.
 */
export function lastStepApprovalResponseFingerprint(messages: UIMessage[]): string | null {
  const message = messages[messages.length - 1];
  if (!message || message.role !== 'assistant') return null;

  const lastStepStartIndex = message.parts.reduce((lastIndex, part, index) => {
    return part.type === 'step-start' ? index : lastIndex;
  }, -1);

  const approvalIds = message.parts
    .slice(lastStepStartIndex + 1)
    .filter(isToolUIPart)
    .filter((part) => part.state === 'approval-responded')
    .map((part) => {
      const approval = 'approval' in part ? part.approval : undefined;
      if (approval && typeof approval === 'object' && 'id' in approval && approval.id) {
        return String(approval.id);
      }
      if ('toolCallId' in part && part.toolCallId) {
        return String(part.toolCallId);
      }
      return String(part.type);
    })
    .sort();

  if (approvalIds.length === 0) return null;
  return approvalIds.join('|');
}
