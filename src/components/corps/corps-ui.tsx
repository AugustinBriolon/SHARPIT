import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CorpsTone = 'good' | 'moderate' | 'low' | 'neutral';

const TONE_DOT: Record<CorpsTone, string> = {
  good: 'bg-emerald-500',
  moderate: 'bg-amber-500',
  low: 'bg-red-500',
  neutral: 'bg-muted-foreground/40',
};

const TONE_TEXT: Record<CorpsTone, string> = {
  good: 'text-emerald-600 dark:text-emerald-400',
  moderate: 'text-amber-600 dark:text-amber-400',
  low: 'text-red-600 dark:text-red-400',
  neutral: 'text-foreground',
};

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
        {label && (
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
            {label}
          </p>
        )}
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
    <div className="bg-card/60 rounded-2xl border px-4 py-4">
      <div className="flex items-center gap-2">
        <span className={cn('size-1.5 shrink-0 rounded-full', TONE_DOT[tone])} />
        <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.15em] uppercase">
          {label}
        </p>
      </div>
      <p className={cn('mt-2 text-2xl leading-none font-bold tabular-nums', TONE_TEXT[tone])}>
        {value}
      </p>
      {sublabel && <p className="text-foreground/80 mt-1 text-xs">{sublabel}</p>}
      {footer && <p className="text-muted-foreground mt-1 text-[10px]">{footer}</p>}
    </div>
  );
}

export function CorpsDisclaimer({
  title,
  children,
  icon: Icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: LucideIcon;
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
  icon: LucideIcon;
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
      <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
        {label}
        {count != null && (
          <span className="text-foreground/60 ml-1.5 font-mono text-[10px] tabular-nums">
            {count}
          </span>
        )}
      </p>
      <div className="bg-border/60 h-px flex-1" />
    </div>
  );
}
