'use client';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { WifiOff } from 'lucide-react';
import { mapVerdictToDisplay, type OverallVerdict } from '@/lib/today-mapping';
import { resolve } from '@/lib/french';
import type { PersistedSnapshotEntry } from '@/lib/pwa/snapshot-store-validation';

/**
 * Minimal, deliberately smaller than Today: Today's normal rendering pipeline
 * is a server-built ViewModel, unavailable offline by design (no client-side
 * inference or ViewModel reconstruction — see ADR-008). This shows only the
 * already-`READY`-classified Snapshot fields (per SNAPSHOT_QUALITY_V1_AUDIT.md):
 * verdict, confidence, limiting factor — read-only, never a new instruction.
 */
export function OfflineSnapshotSummary({ entry }: { entry: PersistedSnapshotEntry }) {
  const { snapshot } = entry;
  const verdict = snapshot.todaysDecision
    ? mapVerdictToDisplay(snapshot.todaysDecision as OverallVerdict)
    : null;
  const limitingFactorLabel = snapshot.limitingFactor?.description
    ? resolve(snapshot.limitingFactor.description)
    : null;
  const generatedAtLabel = formatDistanceToNow(new Date(snapshot.generatedAt), {
    locale: fr,
    addSuffix: true,
  });

  return (
    <div className="mx-auto space-y-4">
      <div className="border-border/60 bg-muted/20 flex items-center gap-2 rounded-lg border px-3 py-2">
        <WifiOff className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
        <span className="text-muted-foreground text-xs font-medium">
          Lecture seule — hors ligne, données non synchronisables
        </span>
      </div>

      <div className="border-border/60 rounded-2xl border p-5">
        {verdict && (
          <p className={`font-heading text-lg font-semibold ${verdict.colorClass}`}>
            {verdict.label}
          </p>
        )}
        {snapshot.confidenceLabel && (
          <p className="text-muted-foreground mt-1 text-sm">{snapshot.confidenceLabel}</p>
        )}
        {limitingFactorLabel && (
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {limitingFactorLabel}
          </p>
        )}
        <p className="text-muted-foreground mt-4 text-xs">
          Dernière mise à jour {generatedAtLabel}
        </p>
      </div>
    </div>
  );
}
