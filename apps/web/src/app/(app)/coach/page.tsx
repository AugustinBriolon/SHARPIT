import { MessageCircleOff } from 'lucide-react';
import { Suspense } from 'react';
import { CoachView } from '@/components/coach/view/coach-view';
import { CoachHubSkeleton } from '@/components/coach/view/coach-hub-skeleton';
import { DemoCoachTranscript } from '@/components/coach/view/demo-coach-transcript';
import { DemoExitButton } from '@/components/demo/demo-exit';
import { isDemoSession } from '@sharpit/app/lib/demo/demo-session';
import type { DemoCoachTranscriptPayload } from '@sharpit/app/lib/web/payloads';
import { cachedServerApiJson } from '@/server/api-client';

async function CoachDemoDisabled() {
  if (!(await isDemoSession())) {
    return <CoachView />;
  }

  const transcript = await cachedServerApiJson<DemoCoachTranscriptPayload>(
    '/api/web/demo-coach-transcript',
  );
  if (transcript) {
    return <DemoCoachTranscript messages={transcript.messages} title={transcript.title} />;
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
