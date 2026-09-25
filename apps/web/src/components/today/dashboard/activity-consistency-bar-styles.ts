import type { ProgramWeek } from '@/lib/activity/list/activity-consistency';
import { cn } from '@/lib/utils';

export function programWeekBarClassName(week: ProgramWeek, filled: boolean): string {
  return cn(
    'w-full rounded-[3px]',
    filled && 'bg-primary border-0',
    !filled && !week.isCurrent && 'bg-muted-foreground/20 border-0',
    week.isCurrent && !filled && 'border-primary/40 border border-dashed bg-transparent',
  );
}
