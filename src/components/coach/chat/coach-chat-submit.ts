import type { UIMessage } from 'ai';
import {
  dismissUnresolvedCalendarTools,
  hasUnresolvedCalendarTools,
} from '@/lib/coach/chat/coach-tool-parts';
import { clearCoachInputDraft } from '@/lib/coach/chat/coach-input-draft';
import { createClientId } from '@/lib/client-id';
import type { CoachDiscussContext } from '@/lib/coach/chat/coach-discuss-context';

type SubmitContext = {
  value: string;
  conversationId: string;
  attachedContext?: CoachDiscussContext | null;
  setInput: (value: string) => void;
  onDetachContext?: () => void;
};

async function submitEphemeralCoachMessage(
  options: SubmitContext & {
    createConversation: {
      mutateAsync: (args: { messages: UIMessage[] }) => Promise<{ id: string }>;
    };
    onConversationCreated?: (id: string) => void;
  },
): Promise<void> {
  const userMessage: UIMessage = {
    id: createClientId(),
    role: 'user',
    parts: [{ type: 'text', text: options.value }],
  };
  try {
    const conversation = await options.createConversation.mutateAsync({
      messages: [userMessage],
    });
    clearCoachInputDraft(options.conversationId);
    options.setInput('');
    if (options.attachedContext) {
      options.onDetachContext?.();
    }
    options.onConversationCreated?.(conversation.id);
  } catch (err) {
    console.error('[coach-chat] create', err);
  }
}

function submitPersistedCoachMessage(
  options: SubmitContext & {
    sendMessage: (args: { text: string }) => void;
  },
): void {
  options.sendMessage({ text: options.value });
  clearCoachInputDraft(options.conversationId);
  options.setInput('');
  if (options.attachedContext) {
    options.onDetachContext?.();
  }
}

function dismissCalendarToolsIfNeeded(options: {
  messages: UIMessage[];
  isEphemeral: boolean;
  conversationId: string;
  setMessages: (messages: UIMessage[]) => void;
  saveMessages: (args: { id: string; messages: UIMessage[] }) => Promise<unknown>;
}): void {
  if (!hasUnresolvedCalendarTools(options.messages)) {
    return;
  }
  const dismissed = dismissUnresolvedCalendarTools(options.messages);
  options.setMessages(dismissed);
  if (!options.isEphemeral) {
    options
      .saveMessages({ id: options.conversationId, messages: dismissed })
      .catch((err) => console.error('[coach-chat] save dismiss', err));
  }
}

export type CoachChatSubmitOptions = {
  text: string;
  inputLocked: boolean;
  guardDisabled: boolean;
  messages: UIMessage[];
  isEphemeral: boolean;
  conversationId: string;
  attachedContext?: CoachDiscussContext | null;
  setShowJumpToLatest: (show: boolean) => void;
  viewportRef: React.RefObject<HTMLElement | null>;
  setMessages: (messages: UIMessage[]) => void;
  saveMessages: (args: { id: string; messages: UIMessage[] }) => Promise<unknown>;
  createConversation: {
    mutateAsync: (args: { messages: UIMessage[] }) => Promise<{ id: string }>;
  };
  sendMessage: (args: { text: string }) => void;
  setInput: (value: string) => void;
  onDetachContext?: () => void;
  onConversationCreated?: (id: string) => void;
};

export async function submitCoachChatMessage(options: CoachChatSubmitOptions): Promise<void> {
  const value = options.text.trim();
  if (!value || options.inputLocked || options.guardDisabled) {
    return;
  }

  options.setShowJumpToLatest(false);
  const viewport = options.viewportRef.current;
  if (viewport) {
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
  }

  dismissCalendarToolsIfNeeded({
    messages: options.messages,
    isEphemeral: options.isEphemeral,
    conversationId: options.conversationId,
    setMessages: options.setMessages,
    saveMessages: options.saveMessages,
  });

  const context = {
    value,
    conversationId: options.conversationId,
    attachedContext: options.attachedContext,
    setInput: options.setInput,
    onDetachContext: options.onDetachContext,
  };

  if (options.isEphemeral) {
    await submitEphemeralCoachMessage({
      ...context,
      createConversation: options.createConversation,
      onConversationCreated: options.onConversationCreated,
    });
    return;
  }

  submitPersistedCoachMessage({
    ...context,
    sendMessage: options.sendMessage,
  });
}
