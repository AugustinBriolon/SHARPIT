'use client';

import Link from 'next/link';
import { useReconnectBannerSnooze } from '@/hooks/use-reconnect-banner-snooze';

export function SnapshotStatusBanner({
  message,
  isRefreshing,
  href,
  snoozeKey,
}: {
  message: string;
  isRefreshing?: boolean;
  href?: string | null;
  snoozeKey?: string | null;
}) {
  const { ready, visible, snooze } = useReconnectBannerSnooze(snoozeKey);

  if (snoozeKey && (!ready || !visible)) return null;

  return (
    <div className="analysis-panel rounded-analysis-lg px-4 py-3" role="status">
      <p className="text-label mb-1">État</p>
      <p className="text-foreground text-sm leading-relaxed">{message}</p>
      {href ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link className="text-sm font-medium underline-offset-4 hover:underline" href={href}>
            Reconnecter
          </Link>
          {snoozeKey ? (
            <button
              className="text-muted-foreground text-sm underline-offset-4 hover:underline"
              type="button"
              onClick={snooze}
            >
              Plus tard
            </button>
          ) : null}
        </div>
      ) : null}
      {isRefreshing && <p className="text-muted-foreground mt-1 text-xs">Mise à jour en cours…</p>}
    </div>
  );
}
