import { Activity } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <Activity className="size-6 text-primary" strokeWidth={2.25} />
        </div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          SharpIt
        </h1>
        <p className="text-sm text-muted-foreground">Training intelligence</p>
      </div>
      {children}
    </div>
  );
}
