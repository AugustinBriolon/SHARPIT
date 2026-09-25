import { fetchJson, type Serialized, toDate } from './shared';

export interface ClientConversationSummary {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientConversation extends ClientConversationSummary {
  messages: unknown;
}

export async function fetchConversations(): Promise<ClientConversationSummary[]> {
  const data = await fetchJson<Serialized<ClientConversationSummary>[]>('/api/coach/conversations');
  return data.map((c) => ({
    id: c.id,
    title: c.title,
    createdAt: toDate(c.createdAt),
    updatedAt: toDate(c.updatedAt),
  }));
}

export async function fetchConversation(id: string): Promise<ClientConversation> {
  const c = await fetchJson<Serialized<ClientConversation>>(`/api/coach/conversations/${id}`);
  return {
    id: c.id,
    title: c.title,
    messages: c.messages,
    createdAt: toDate(c.createdAt),
    updatedAt: toDate(c.updatedAt),
  };
}
