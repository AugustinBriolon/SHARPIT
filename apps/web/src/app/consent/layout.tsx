import { Activity } from 'lucide-react';

export default function ConsentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background relative flex min-h-dvh flex-col items-center overflow-x-hidden px-6 py-6 sm:py-10">
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-5 sm:gap-8">
        <header className="flex flex-col items-center gap-2 text-center sm:gap-3">
          <div className="icon-well size-10 sm:size-12" aria-hidden>
            <Activity className="size-5 sm:size-6" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-page-title">SharpIt</p>
            <p className="text-muted-foreground mt-1 text-sm text-pretty">
              Consentements pour utiliser ton Twin en confiance.
            </p>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
