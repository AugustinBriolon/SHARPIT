import { cn } from '@/lib/utils';

const VARIANT_CLASS = {
  dashboard: 'text-[10px] font-semibold text-slate-500 uppercase dark:text-slate-400',
  section: 'text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase',
  corps: 'text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase',
  metric: 'text-muted-foreground text-[10px] font-medium tracking-wide uppercase',
  alert: 'text-[11px] font-medium tracking-wide text-orange-600 uppercase',
} as const;

export function EyebrowLabel({
  children,
  variant = 'section',
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof VARIANT_CLASS;
  className?: string;
}) {
  return <p className={cn(VARIANT_CLASS[variant], className)}>{children}</p>;
}
