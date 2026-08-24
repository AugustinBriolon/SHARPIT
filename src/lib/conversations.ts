import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

const DEFAULT_TITLE = 'Nouvelle conversation';
const TITLE_MAX = 60;
const BOOTSTRAP_TTL_MS = 60_000;
const bootstrapConversationIds = new Map<string, { id: string; createdAtMs: number }>();

/** Dérive un titre lisible à partir du premier message utilisateur. */
function deriveTitle(messages: unknown): string {
  if (!Array.isArray(messages)) return DEFAULT_TITLE;
  for (const message of messages) {
    if (
      typeof message !== 'object' ||
      message === null ||
      (message as { role?: string }).role !== 'user'
    ) {
      continue;
    }
    const { parts } = message as { parts?: unknown };
    if (!Array.isArray(parts)) continue;
    const text = parts
      .filter(
        (p): p is { type: 'text'; text: string } =>
          typeof p === 'object' &&
          p !== null &&
          (p as { type?: string }).type === 'text' &&
          typeof (p as { text?: unknown }).text === 'string',
      )
      .map((p) => p.text)
      .join(' ')
      .trim();
    if (text) {
      return text.length > TITLE_MAX ? `${text.slice(0, TITLE_MAX)}…` : text;
    }
  }
  return DEFAULT_TITLE;
}

/** Liste des conversations (sans les messages, pour la sidebar). */
export async function listConversations(athleteId: string) {
  const rows = await prisma.conversation.findMany({
    where: { athleteId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, createdAt: true, updatedAt: true, messages: true },
  });

  return rows
    .filter((row) => Array.isArray(row.messages) && row.messages.length > 0)
    .map(({ messages: _messages, ...summary }) => summary);
}

export async function getConversation(athleteId: string, id: string) {
  return prisma.conversation.findFirst({ where: { id, athleteId } });
}

/** Crée une conversation, en option avec des messages initiaux (titre auto). */
export async function createConversation(
  athleteId: string,
  messages?: unknown,
  bootstrapKey?: string,
) {
  const hasMessages = Array.isArray(messages) && messages.length > 0;
  const hasBootstrapKey = typeof bootstrapKey === 'string' && bootstrapKey.trim().length > 0;

  if (!hasMessages && !hasBootstrapKey) {
    throw new Error('Une conversation doit contenir au moins un message.');
  }
  const now = Date.now();

  if (bootstrapKey) {
    for (const [key, value] of bootstrapConversationIds.entries()) {
      if (now - value.createdAtMs > BOOTSTRAP_TTL_MS) {
        bootstrapConversationIds.delete(key);
      }
    }

    const cached = bootstrapConversationIds.get(bootstrapKey);
    if (cached) {
      const existing = await prisma.conversation.findFirst({
        where: { id: cached.id, athleteId },
      });
      if (existing) return existing;
      bootstrapConversationIds.delete(bootstrapKey);
    }
  }

  const conversation = await prisma.conversation.create({
    data: {
      athleteId,
      title: hasMessages ? deriveTitle(messages) : DEFAULT_TITLE,
      messages: (hasMessages ? messages : []) as Prisma.InputJsonValue,
    },
  });

  if (bootstrapKey) {
    bootstrapConversationIds.set(bootstrapKey, {
      id: conversation.id,
      createdAtMs: now,
    });
  }

  return conversation;
}

/** Enregistre l'historique complet ; régénère le titre s'il est encore par défaut. */
export async function saveConversationMessages(athleteId: string, id: string, messages: unknown) {
  const existing = await prisma.conversation.findFirst({
    where: { id, athleteId },
    select: { title: true },
  });
  if (!existing) return null;

  const shouldRetitle = existing.title === DEFAULT_TITLE;
  const { count } = await prisma.conversation.updateMany({
    where: { id, athleteId },
    data: {
      messages: (messages ?? []) as Prisma.InputJsonValue,
      ...(shouldRetitle ? { title: deriveTitle(messages) } : {}),
    },
  });
  if (count === 0) return null;
  return prisma.conversation.findUnique({ where: { id } });
}

export async function renameConversation(athleteId: string, id: string, title: string) {
  const clean = title.trim().slice(0, TITLE_MAX) || DEFAULT_TITLE;
  const { count } = await prisma.conversation.updateMany({
    where: { id, athleteId },
    data: { title: clean },
  });
  if (count === 0) return null;
  return prisma.conversation.findUnique({ where: { id } });
}

export async function deleteConversation(athleteId: string, id: string) {
  const owned = await prisma.conversation.findFirst({
    where: { id, athleteId },
    select: { id: true },
  });
  if (!owned) return null;
  return prisma.conversation.delete({ where: { id } });
}
