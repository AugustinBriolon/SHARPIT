import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertSeverity, SmartAlert } from "@/lib/alerts";

const STYLES: Record<
  AlertSeverity,
  { wrap: string; icon: typeof Info; iconColor: string; title: string }
> = {
  danger: {
    wrap: "border-red-500/40 bg-red-500/5",
    icon: ShieldAlert,
    iconColor: "text-red-600",
    title: "text-red-700 dark:text-red-400",
  },
  warning: {
    wrap: "border-amber-500/40 bg-amber-500/5",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    title: "text-amber-700 dark:text-amber-400",
  },
  info: {
    wrap: "border-border bg-card",
    icon: Info,
    iconColor: "text-muted-foreground",
    title: "text-foreground",
  },
};

export function AlertsBanner({ alerts }: { alerts: SmartAlert[] }) {
  if (!alerts.length) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Alertes
      </h2>
      <div className="grid gap-3 lg:grid-cols-2">
        {alerts.map((alert) => {
          const style = STYLES[alert.severity];
          const Icon = style.icon;
          return (
            <div
              key={alert.id}
              className={cn("flex gap-3 rounded-xl border p-4", style.wrap)}
            >
              <Icon className={cn("mt-0.5 size-5 shrink-0", style.iconColor)} />
              <div className="space-y-0.5">
                <p className={cn("text-sm font-medium", style.title)}>
                  {alert.title}
                </p>
                <p className="text-sm text-muted-foreground">{alert.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
