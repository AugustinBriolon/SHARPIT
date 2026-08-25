import { MessageCircleOff } from 'lucide-react';
import { Suspense } from 'react';
import { CoachView } from '@/components/coach/coach-view';
import { CoachHubSkeleton } from '@/components/coach/coach-hub-skeleton';
import { DemoExitButton } from '@/components/demo/demo-exit';
import { isDemoSession } from '@/lib/demo/demo-session';

async function CoachDemoDisabled() {
  if (!(await isDemoSession())) return <CoachView />;

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
