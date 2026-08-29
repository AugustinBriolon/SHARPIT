import { Activity } from 'lucide-react';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background relative flex min-h-screen flex-col items-center overflow-hidden px-6 py-10">
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col items-center gap-3 text-center">
          <div className="icon-well size-12" aria-hidden>
            <Activity className="size-6" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-page-title">SharpIt</p>
            <p className="text-muted-foreground mt-1 text-sm text-pretty">
              Premiers pas pour rendre ton Twin utilisable.
            </p>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
