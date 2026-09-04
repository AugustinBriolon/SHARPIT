import { Activity } from 'lucide-react';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background relative flex min-h-dvh flex-col items-center overflow-x-hidden px-6 py-6 sm:py-10">
      {/* Flex column so each step can own a sticky action bar without viewport math. */}
      <div className="relative z-10 flex w-full max-w-lg flex-1 flex-col gap-5 sm:gap-6">
        <header className="flex items-center gap-2">
          <div className="icon-well size-7" aria-hidden>
            <Activity className="size-4" strokeWidth={2.25} />
          </div>
          <p className="text-section-title">SharpIt</p>
        </header>
        {children}
      </div>
    </div>
  );
}
