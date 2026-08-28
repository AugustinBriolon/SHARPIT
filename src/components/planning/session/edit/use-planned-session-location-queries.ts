'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';

export function usePlannedSessionLocationQueries() {
  const homeQuery = useQuery({
    queryKey: ['geocoding', 'home'],
    queryFn: async () => {
      const res = await fetch('/api/geocoding/home');
      if (!res.ok) {
        throw new Error('home fetch failed');
      }
      return res.json() as Promise<{
        home: { label?: string; latitude: number; longitude: number };
      }>;
    },
    staleTime: 5 * 60_000,
  });

  const travelQuery = useQuery({
    queryKey: queryKeys.travelContext,
    queryFn: async () => {
      const res = await fetch('/api/travel-context');
      if (!res.ok) {
        throw new Error('travel fetch failed');
      }
      return res.json() as Promise<{
        active: {
          locationLabel: string;
          locationLat: number;
          locationLng: number;
          startDate: string;
          endDate: string;
        } | null;
      }>;
    },
    staleTime: 60_000,
  });

  return { homeQuery, travelQuery };
}
