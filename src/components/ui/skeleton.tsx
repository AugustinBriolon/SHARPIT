import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-xl border border-border/60 bg-muted/60", className)}
      aria-hidden
    />
  );
}
