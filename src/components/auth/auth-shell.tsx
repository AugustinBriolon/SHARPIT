import { Activity } from "lucide-react";

export function AuthShell({
  children,
  subtitle = "Connecte-toi pour accéder à ton espace d'entraînement.",
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.68_0.16_150_/_0.08),_transparent_55%)]"
      />
      <div className="relative z-10 flex w-full max-w-[420px] flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Activity className="size-6 text-primary" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
              SharpIt
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
