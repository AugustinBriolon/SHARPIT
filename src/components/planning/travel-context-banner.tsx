'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronRight, MapPin, X } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCoachMemoryMutations } from '@/hooks/use-coach-memory';
import { queryKeys } from '@/lib/query/keys';
import { asLocalCalendarDate } from '@/lib/travel-context/calendar-date';

type TravelContextResponse = {
  active: {
    id: string;
    label: string | null;
    locationLabel: string;
    startDate: string;
    endDate: string;
    note: string | null;
  } | null;
};

export function TravelContextBanner() {
  const { remove } = useCoachMemoryMutations();
  const query = useQuery({
    queryKey: queryKeys.travelContext,
    queryFn: async (): Promise<TravelContextResponse> => {
      const res = await fetch('/api/travel-context');
      if (!res.ok) throw new Error('travel context fetch failed');
      return res.json();
    },
    staleTime: 60_000,
  });

  const active = query.data?.active;
  if (!active) return null;

  const memoryHref = `/settings/memory?focus=${active.id}`;

  return (
    <div className="border-primary/30 bg-primary/5 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
      <Link
        className="hover:bg-primary/5 -mx-1 flex min-w-0 flex-1 items-start gap-2 rounded-md px-1 py-0.5 transition-colors"
        href={memoryHref}
      >
        <MapPin className="text-primary mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-sm font-medium">
            {active.label ?? 'Contexte voyage actif'}
          </p>
          <p className="text-muted-foreground text-xs">
            {active.locationLabel} ·{' '}
            {format(asLocalCalendarDate(active.startDate), 'd MMM', { locale: fr })} —{' '}
            {format(asLocalCalendarDate(active.endDate), 'd MMM yyyy', { locale: fr })}
          </p>
        </div>
        <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      </Link>
      <div className="flex items-center gap-2">
        <Badge className="rounded-full font-normal" variant="outline">
          Météo voyage
        </Badge>
        <Button
          aria-label="Supprimer le contexte voyage de la mémoire du coach"
          size="icon"
          type="button"
          variant="ghost"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            remove.mutate(active.id);
          }}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
