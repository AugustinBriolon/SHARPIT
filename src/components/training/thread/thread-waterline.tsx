'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function ThreadWaterline({ anchorLabel }: { anchorLabel?: string | null }) {
  const scrubbed = Boolean(anchorLabel);

  return (
    <div className="my-3 flex items-center gap-3" aria-hidden>
      <span
        className={cn(
          'h-0.5 flex-1 rounded-full',
          scrubbed ? 'bg-muted-foreground/30' : 'bg-primary',
        )}
      />
      <p
        className={cn(
          'text-data shrink-0 text-[11px] font-semibold tracking-wide uppercase',
          scrubbed ? 'text-muted-foreground' : 'text-primary',
        )}
      >
        {anchorLabel ?? `Aujourd’hui · ${format(new Date(), 'EEE d', { locale: fr })}`}
      </p>
      <span
        className={cn(
          'h-0.5 flex-1 rounded-full',
          scrubbed ? 'bg-muted-foreground/30' : 'bg-primary',
        )}
      />
    </div>
  );
}
