import { prisma } from '@sharpit/db/client';
import { parseDemoTranscriptMessages } from '@sharpit/server/lib/demo/demo-coach-transcript';

/** The seeded coach conversation the demo account reads in place of a live coach. */
export async function loadDemoCoachTranscript(athleteId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { athleteId },
    orderBy: { createdAt: 'asc' },
  });
  const messages = conversation ? parseDemoTranscriptMessages(conversation.messages) : [];
  return conversation && messages.length > 0 ? { title: conversation.title, messages } : null;
}

export type DemoCoachTranscriptPayload = NonNullable<
  Awaited<ReturnType<typeof loadDemoCoachTranscript>>
>;
