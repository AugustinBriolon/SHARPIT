'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import type { BrickAnalysis } from '@/lib/validators/coach';

export interface ClientBrickAnalysis {
  brickGroupId: string;
  content: BrickAnalysis;
  generatedAt: string;
}

export function useBrickAnalysis(brickGroupId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.brickAnalysis(brickGroupId ?? ''),
    enabled: Boolean(brickGroupId),
    queryFn: async (): Promise<ClientBrickAnalysis | null> => {
      const res = await fetch(
        `/api/planned-sessions/brick/analyze?groupId=${encodeURIComponent(brickGroupId!)}`,
      );
      if (!res.ok) {
        throw new Error("Impossible de charger l'analyse du brick.");
      }
      const data = (await res.json()) as { analysis: ClientBrickAnalysis | null };
      return data.analysis ?? null;
    },
  });
}

export function useAnalyzeBrick() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (brickGroupId: string) => {
      const res = await fetch('/api/planned-sessions/brick/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brickGroupId }),
      });
      const data = (await res.json().catch(() => null)) as {
        analysis?: ClientBrickAnalysis;
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "L'analyse du brick a échoué.");
      }
      return data!.analysis as ClientBrickAnalysis;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.brickAnalysis(data.brickGroupId), data);
    },
  });
}
