import { Activity } from 'lucide-react';

export function AuthShell({
  children,
  subtitle = "Connecte-toi pour accéder à ton espace d'entraînement.",
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
      <div className="relative z-10 flex w-full max-w-[420px] flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="icon-well size-12 rounded-xl">
            <Activity className="size-6" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-page-title">SharpIt</h1>
            <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
          </div>
        </div>
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
