'use client';

import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className={cn(
        'flex items-center justify-center gap-2 bg-amber-500/95 px-4 py-2 text-xs font-medium text-amber-950',
        'safe-area-top',
      )}
    >
      <WifiOff className="size-3.5 shrink-0" aria-hidden />
      Hors ligne — les données nécessitent une connexion
    </div>
  );
}
