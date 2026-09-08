'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { partitionWeightedInstruments } from './weighted-instruments-helpers';

export type WeightedInstrumentSlot = {
  label: string;
  value: string | null;
};

function InstrumentCell({
  label,
  value,
  loading,
  prominence,
}: {
  label: string;
  value: string | null;
  loading?: boolean;
  prominence: 'primary' | 'secondary';
}) {
  return (
    <div
      className={cn(
        'activity-log-field min-w-0',
        prominence === 'primary' && 'activity-log-field-primary',
      )}
    >
      <p className="text-label text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-20 rounded-md" />
      ) : (
        <p
          className={cn(
            'text-data text-foreground mt-1 font-semibold tabular-nums',
            prominence === 'primary'
              ? 'text-[clamp(1.5rem,5vw,2rem)] leading-[1.05]'
              : 'text-[clamp(1.1rem,3.5vw,1.35rem)] leading-[1.1]',
          )}
        >
          {value ?? '—'}
        </p>
      )}
    </div>
  );
}

function primaryGridClass(count: number): string {
  if (count >= 3) {
    return 'grid-cols-2 sm:grid-cols-3';
  }
  if (count === 2) {
    return 'grid-cols-2';
  }
  if (count === 1) {
    return 'grid-cols-1';
  }
  return '';
}

function loadingPrimaryPlaceholders(count: number): WeightedInstrumentSlot[] {
  return Array.from({ length: count }, (_, i) => ({
    label: `metric-${i}`,
    value: null,
  }));
}

export function WeightedInstruments({
  items,
  loading = false,
  primaryCount = 3,
}: {
  items: WeightedInstrumentSlot[];
  loading?: boolean;
  primaryCount?: number;
}) {
  const { primary, secondary } = partitionWeightedInstruments(items, primaryCount);

  if (items.length === 0 && !loading) {
    return null;
  }

  const primaryItems =
    loading && primary.length === 0 ? loadingPrimaryPlaceholders(primaryCount) : primary;

  return (
    <section aria-label="Instruments de séance" className="space-y-3">
      <div
        className={cn(
          'activity-log-instrument-row grid gap-3',
          primaryGridClass(primaryItems.length),
        )}
      >
        {primaryItems.map((item) => (
          <InstrumentCell
            key={item.label}
            label={loading && primary.length === 0 ? '…' : item.label}
            loading={loading}
            prominence="primary"
            value={item.value}
          />
        ))}
      </div>

      {secondary.length > 0 ? (
        <div
          aria-label="Instruments complémentaires"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          {secondary.map((item) => (
            <InstrumentCell
              key={item.label}
              label={item.label}
              prominence="secondary"
              value={item.value}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
