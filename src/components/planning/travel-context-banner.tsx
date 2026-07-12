'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['travel-context'],
    queryFn: async (): Promise<TravelContextResponse> => {
      const res = await fetch('/api/travel-context');
      if (!res.ok) throw new Error('travel context fetch failed');
      return res.json();
    },
    staleTime: 60_000,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/travel-context/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['travel-context'] });
      void queryClient.invalidateQueries({ queryKey: ['planned-sessions'] });
    },
  });

  const active = query.data?.active;
  if (!active) return null;

  return (
    <div className="border-primary/30 bg-primary/5 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
      <div className="flex min-w-0 items-start gap-2">
        <MapPin className="text-primary mt-0.5 size-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-foreground text-sm font-medium">
            {active.label ?? 'Contexte voyage actif'}
          </p>
          <p className="text-muted-foreground text-xs">
            {active.locationLabel} · {format(new Date(active.startDate), 'd MMM', { locale: fr })} —{' '}
            {format(new Date(active.endDate), 'd MMM yyyy', { locale: fr })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge className="rounded-full font-normal" variant="outline">
          Météo voyage
        </Badge>
        <Button
          aria-label="Terminer le contexte voyage"
          disabled={remove.isPending}
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => remove.mutate(active.id)}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
