import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  accent?: "cyan" | "orange" | "violet" | "default";
  className?: string;
}

const accentMap = {
  cyan: "text-cyan-400",
  orange: "text-orange-400",
  violet: "text-violet-400",
  default: "text-foreground",
};

export function MetricCard({
  label,
  value,
  sublabel,
  accent = "default",
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "h-28 rounded-xl border border-border/60 bg-card/50 p-4 backdrop-blur-sm",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-mono text-2xl font-semibold tabular-nums",
          accentMap[accent],
        )}
      >
        {value}
      </p>
      {sublabel && (
        <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
      )}
    </div>
  );
}
