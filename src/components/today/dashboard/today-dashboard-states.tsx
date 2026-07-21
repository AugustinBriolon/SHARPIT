'use client';

export function SnapshotStatusBanner({
  message,
  isRefreshing,
}: {
  message: string;
  isRefreshing?: boolean;
}) {
  return (
    <div className="analysis-panel rounded-analysis-lg px-4 py-3">
      <p className="text-label mb-1">État</p>
      <p className="text-foreground text-sm leading-relaxed">{message}</p>
      {isRefreshing ? (
        <p className="text-muted-foreground mt-1 text-xs">Mise à jour en cours…</p>
      ) : null}
    </div>
  );
}
