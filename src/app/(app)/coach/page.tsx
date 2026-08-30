import { MessageCircleOff } from 'lucide-react';
import { Suspense } from 'react';
import { CoachView } from '@/components/coach/coach-view';
import { CoachHubSkeleton } from '@/components/coach/coach-hub-skeleton';
import { DemoCoachTranscript } from '@/components/coach/demo-coach-transcript';
import { DemoExitButton } from '@/components/demo/demo-exit';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { isDemoSession } from '@/lib/demo/demo-session';
import { parseDemoTranscriptMessages } from '@/lib/demo/demo-coach-transcript';
import { prisma } from '@/lib/prisma';

async function CoachDemoDisabled() {
  if (!(await isDemoSession())) {
    return <CoachView />;
  }

  const athleteId = await getCurrentAthleteId();
  const conversation = await prisma.conversation.findFirst({
    where: { athleteId },
    orderBy: { createdAt: 'asc' },
  });
  const messages = conversation ? parseDemoTranscriptMessages(conversation.messages) : [];

  if (conversation && messages.length > 0) {
    return <DemoCoachTranscript messages={messages} title={conversation.title} />;
  }

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <MessageCircleOff className="text-muted-foreground size-6" aria-hidden />
      </div>
      <div>
        <h1 className="text-page-title">Indisponible en démo</h1>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          Le Coach n&apos;est pas disponible sur le compte démo partagé. Ouvre un compte personnel
          pour discuter.
        </p>
      </div>
      <DemoExitButton />
    </div>
  );
}

export default function CoachPage() {
  return (
    <Suspense fallback={<CoachHubSkeleton />}>
      <CoachDemoDisabled />
    </Suspense>
  );
}
