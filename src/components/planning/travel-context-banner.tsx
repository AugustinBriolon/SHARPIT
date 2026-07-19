'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronRight, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { asLocalCalendarDate } from '@/lib/travel-context/calendar-date';
import { filterTravelsOverlappingRange } from '@/lib/travel-context/overlap';

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

export function TravelContextBanner({
  rangeStart,
  rangeEnd,
}: {
  /** Inclusive planning window — defaults to today when omitted. */
  rangeStart?: Date;
  rangeEnd?: Date;
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

  const heading = travels.length > 1 ? 'Déplacements' : 'Déplacement';

  return (
    <section className="analysis-panel rounded-analysis-lg px-4 py-3 sm:px-5">
      <div className="flex items-center gap-2">
        <MapPin className="text-muted-foreground size-3.5 shrink-0" />
        <p className="text-label">{heading}</p>
      </div>

      <ul className="divide-analysis-border mt-1 divide-y">
        {travels.map((travel) => {
          const title = travel.label?.trim() || travel.locationLabel || 'Déplacement';
          const locationLine =
            travel.locationLabel && travel.label?.trim() ? travel.locationLabel : null;
          const window = formatTravelWindow(travel.startDate, travel.endDate);

          return (
            <li key={travel.id}>
              <Link
                className="hover:bg-analysis-surface-alt/60 -mx-1 flex items-center gap-3 rounded-md px-1 py-2.5 transition-colors"
                href={`/settings/memory?focus=${travel.id}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-medium">{title}</p>
                  <p className="text-muted-foreground text-data mt-0.5 text-[11px]">
                    {locationLine ? `${locationLine} · ${window}` : window}
                  </p>
                </div>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
