import type { DemoCoachTranscriptPayload } from '@sharpit/app/lib/web/payloads';
import { prisma } from '@sharpit/db/client';
import { parseDemoTranscriptMessages } from '@sharpit/app/lib/demo/demo-coach-transcript';

/** The seeded coach conversation the demo account reads in place of a live coach. */
export async function loadDemoCoachTranscript(
  athleteId: string,
): Promise<DemoCoachTranscriptPayload | null> {
  const conversation = await prisma.conversation.findFirst({
    where: { athleteId },
    orderBy: { createdAt: 'asc' },
  });
  const messages = conversation ? parseDemoTranscriptMessages(conversation.messages) : [];
  return conversation && messages.length > 0 ? { title: conversation.title, messages } : null;
}

export type { DemoCoachTranscriptPayload };
