import { cn } from '@/lib/utils';

export function adaptChangeRowClass(rejected: boolean, selected: boolean) {
  if (rejected) {
    return 'border-signal-risk/30 bg-signal-risk/5 cursor-not-allowed opacity-80';
  }
  if (selected) {
    return 'border-primary/40 bg-primary/5';
  }
  return 'border-analysis-border/60 bg-analysis-surface-alt/50 opacity-60 hover:opacity-100';
}

export function adaptChangeSelectClass(selected: boolean, rejected: boolean) {
  return cn(
    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border',
    selected && !rejected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
  );
}
