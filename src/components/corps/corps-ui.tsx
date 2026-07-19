import { ClinicalAnnotation } from '@/components/ui/clinical-annotation';
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
  return (
    <div className={cn('analysis-panel rounded-analysis-lg px-5 py-4', className)}>{children}</div>
  );
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
        <h2 className="text-section-title">{title}</h2>
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

export function CorpsDisclaimer({ title, children }: { title: string; children: React.ReactNode }) {
  return <ClinicalAnnotation title={title}>{children}</ClinicalAnnotation>;
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
    <div className="analysis-panel rounded-analysis-lg flex flex-col items-center justify-center gap-3 border-dashed px-6 py-14 text-center">
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
