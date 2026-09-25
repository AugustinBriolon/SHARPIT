export const VARIANT_CLASS = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'border border-border bg-card text-foreground hover:border-border',
  outline: 'border border-border bg-transparent text-foreground hover:bg-primary/5',
  ghost: 'text-muted-foreground hover:bg-primary/5 hover:text-foreground',
} as const;

export const SIZE_CLASS = {
  sm: 'h-8 gap-1.5 rounded-full px-3 text-xs',
  md: 'h-10 gap-2 rounded-full px-4 text-sm',
  lg: 'h-12 gap-2.5 rounded-full px-5 text-base',
  icon: 'h-10 w-10 rounded-full',
} as const;
