import { EyebrowLabel } from '@/components/ui/eyebrow-label';
import { MetricCell } from '@/components/ui/metric-cell';
import type { CorpsTone } from '@/lib/metric-tone';
import { CORPS_TONE_DOT, CORPS_TONE_TEXT } from '@/lib/metric-tone';
import { cn } from '@/lib/utils';

export type { CorpsTone };

export function CorpsPanel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn('bg-card/60 rounded-2xl border px-5 py-4', className)}>{children}</div>;
}

export function CorpsSectionHeader({
  label,
  title,
  description,
  action,
}: {
  label?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        {label && <EyebrowLabel variant="corps">{label}</EyebrowLabel>}
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && (
          <p className="text-muted-foreground max-w-2xl text-xs leading-relaxed">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function CorpsStatCard({
  label,
  value,
  sublabel,
  footer,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sublabel?: string;
  footer?: string;
  tone?: CorpsTone;
}) {
  return (
    <MetricCell
      footer={footer}
      label={label}
      layout="card"
      sub={sublabel}
      tone={tone}
      value={value}
      showToneDot
    />
  );
}

export { CORPS_TONE_DOT, CORPS_TONE_TEXT };

export function CorpsDisclaimer({
  title,
  children,
  icon: Icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: import('lucide-react').LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 px-4 py-3.5">
      <div className="flex gap-3">
        {Icon && <Icon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />}
        <div className="space-y-1 text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-200">{title}</p>
          <div className="text-muted-foreground text-xs leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function CorpsEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: import('lucide-react').LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-card/40 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center">
      <Icon className="text-muted-foreground/40 size-8" />
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function CorpsDivider({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-3">
      <EyebrowLabel variant="corps">
        {label}
        {count != null && (
          <span className="text-foreground/60 ml-1.5 font-mono text-[10px] tabular-nums">
            {count}
          </span>
        )}
      </EyebrowLabel>
      <div className="bg-border/60 h-px flex-1" />
    </div>
  );
}
