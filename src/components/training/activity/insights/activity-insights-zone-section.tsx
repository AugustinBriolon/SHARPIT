'use client';

import type { ReactNode } from 'react';
import { ZoneDistribution } from '@/components/training/activity/insights/zone-distribution';
import type { ZoneBucket } from '@/lib/activity/detail/activity-analysis';
import { cn } from '@/lib/utils';

function buildZoneBlocks({
  hrZones,
  powerZones,
  lthr,
  ftp,
  includePower,
}: {
  hrZones: ZoneBucket[];
  powerZones: ZoneBucket[];
  lthr: number | null;
  ftp: number | null;
  includePower: boolean;
}): ReactNode[] {
  const blocks: ReactNode[] = [];
  if (hrZones.some((z) => z.seconds > 0)) {
    blocks.push(
      <ZoneDistribution
        key="hr"
        subtitle={lthr ? `Réf. LTHR ${lthr} bpm` : undefined}
        title="Zones fréquence cardiaque"
        zones={hrZones}
      />,
    );
  }
  if (includePower && powerZones.some((z) => z.seconds > 0)) {
    blocks.push(
      <ZoneDistribution
        key="power"
        subtitle={ftp ? `Réf. FTP ${ftp} W` : undefined}
        title="Zones de puissance"
        zones={powerZones}
      />,
    );
  }
  return blocks;
}

/**
 * Affiche les distributions de zones disponibles. N'occupe deux colonnes que si
 * FC ET puissance existent — sinon la carte unique prend toute la largeur, pour
 * éviter une demi-colonne vide (typique de la course à pied, sans puissance).
 */
export function ActivityInsightsZoneSection({
  hrZones,
  powerZones,
  lthr,
  ftp,
  compact = false,
  includePower = true,
}: {
  hrZones: ZoneBucket[];
  powerZones: ZoneBucket[];
  lthr: number | null;
  ftp: number | null;
  compact?: boolean;
  includePower?: boolean;
}) {
  const blocks = buildZoneBlocks({
    hrZones,
    powerZones,
    lthr,
    ftp,
    includePower,
  });

  if (blocks.length === 0) {
    return null;
  }
  return (
    <div
      className={cn(
        'grid gap-4',
        !compact && blocks.length > 1 && 'lg:grid-cols-2',
        compact && 'bg-analysis-surface-alt rounded-analysis-lg px-4 py-4',
      )}
    >
      {blocks}
    </div>
  );
}
