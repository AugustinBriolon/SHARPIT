import Link from 'next/link';
import { CalendarRange, MessageCircle, NotebookText } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTIONS = [
  { href: '/training/planning', icon: CalendarRange, label: 'Planification' },
  { href: '/training/weekly-review', icon: NotebookText, label: 'Bilan hebdo' },
  { href: '/coach', icon: MessageCircle, label: 'Demander au Coach' },
] as const;

/** Where the athlete goes to change the plan, once he has read it. */
export function PlanActions() {
  return (
    <nav aria-label="Actions plan" className="flex flex-wrap gap-2">
      {ACTIONS.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'chip-surface rounded-analysis inline-flex items-center gap-2 px-3 py-2 text-sm',
            'hover:border-primary/25 focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
          )}
        >
          <Icon className="text-muted-foreground size-3.5" strokeWidth={1.5} aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
