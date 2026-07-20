'use client';

import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      className={cn(
        'bg-signal-caution text-highlight-foreground flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium',
        'safe-area-top',
      )}
    >
      <WifiOff className="size-3.5 shrink-0" aria-hidden />
      Hors ligne — les données nécessitent une connexion
    </div>
  );
}
