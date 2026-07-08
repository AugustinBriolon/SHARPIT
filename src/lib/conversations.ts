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
export async function listConversations() {
  return prisma.conversation.findMany({
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });
}

export async function getConversation(id: string) {
  return prisma.conversation.findUnique({ where: { id } });
}

/** Crée une conversation, en option avec des messages initiaux (titre auto). */
export async function createConversation(messages?: unknown, bootstrapKey?: string) {
  const hasMessages = Array.isArray(messages) && messages.length > 0;
  const now = Date.now();

  if (bootstrapKey) {
    for (const [key, value] of bootstrapConversationIds.entries()) {
      if (now - value.createdAtMs > BOOTSTRAP_TTL_MS) {
        bootstrapConversationIds.delete(key);
      }
    }

    const cached = bootstrapConversationIds.get(bootstrapKey);
    if (cached) {
      const existing = await prisma.conversation.findUnique({ where: { id: cached.id } });
      if (existing) return existing;
      bootstrapConversationIds.delete(bootstrapKey);
    }
  }

  const conversation = await prisma.conversation.create({
    data: {
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
export async function saveConversationMessages(id: string, messages: unknown) {
  const existing = await prisma.conversation.findUnique({
    where: { id },
    select: { title: true },
  });
  if (!existing) return null;

  const shouldRetitle = existing.title === DEFAULT_TITLE;
  return prisma.conversation.update({
    where: { id },
    data: {
      messages: (messages ?? []) as Prisma.InputJsonValue,
      ...(shouldRetitle ? { title: deriveTitle(messages) } : {}),
    },
  });
}

export async function renameConversation(id: string, title: string) {
  const clean = title.trim().slice(0, TITLE_MAX) || DEFAULT_TITLE;
  return prisma.conversation.update({
    where: { id },
    data: { title: clean },
  });
}

export async function deleteConversation(id: string) {
  return prisma.conversation.delete({ where: { id } });
}
