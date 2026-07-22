'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin } from 'lucide-react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LinkButton } from '@/components/ui/link-button';
import { queryKeys } from '@/lib/query/keys';
import { asLocalCalendarDate } from '@/lib/travel-context/calendar-date';
import { filterTravelsOverlappingRange } from '@/lib/travel-context/overlap';
import { cn } from '@/lib/utils';

type TravelContextItem = {
  id: string;
  type?: string;
  label: string | null;
  locationLabel: string | null;
  startDate: string;
  endDate: string;
  note: string | null;
};

type TravelContextResponse = {
  active: TravelContextItem | null;
  activeList?: TravelContextItem[];
  contexts?: TravelContextItem[];
};

function formatTravelWindow(startDate: string, endDate: string): string {
  const start = asLocalCalendarDate(startDate);
  const end = asLocalCalendarDate(endDate);
  const sameYear = start.getFullYear() === end.getFullYear();
  return `${format(start, sameYear ? 'd MMM' : 'd MMM yyyy', { locale: fr })} — ${format(end, 'd MMM yyyy', { locale: fr })}`;
}

/**
 * Compact travel chip for the planning toolbar (next to scenario / coach actions).
 */
export function TravelContextBanner({
  rangeStart,
  rangeEnd,
  className,
}: {
  /** Inclusive planning window — defaults to today when omitted. */
  rangeStart?: Date;
  rangeEnd?: Date;
  className?: string;
}) {
  const query = useQuery({
    queryKey: queryKeys.travelContext,
    queryFn: async (): Promise<TravelContextResponse> => {
      const res = await fetch('/api/travel-context');
      if (!res.ok) throw new Error('travel context fetch failed');
      return res.json();
    },
    staleTime: 60_000,
  });

  const travels = useMemo(() => {
    const from = rangeStart ?? new Date();
    const to = rangeEnd ?? from;
    const pool =
      query.data?.contexts ??
      query.data?.activeList ??
      (query.data?.active ? [query.data.active] : []);
    return filterTravelsOverlappingRange(pool, from, to);
  }, [query.data, rangeEnd, rangeStart]);

  if (travels.length === 0) return null;

  const primary = travels[0]!;
  const title = primary.label?.trim() || primary.locationLabel || 'Déplacement';
  const window = formatTravelWindow(primary.startDate, primary.endDate);
  const extra = travels.length > 1 ? ` +${travels.length - 1}` : '';
  const href = travels.length === 1 ? `/settings/memory?focus=${primary.id}` : '/settings/memory';

  return (
    <LinkButton
      className={cn('max-w-56 shrink-0', className)}
      href={href}
      size="sm"
      title={`${title} · ${window}${extra}`}
      variant="outline"
    >
      <MapPin className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">
        {title}
        {extra}
      </span>
    </LinkButton>
  );
}
