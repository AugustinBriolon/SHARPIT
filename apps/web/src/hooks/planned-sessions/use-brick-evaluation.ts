'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/client/query/keys';
import { sendJson } from '@/client/query/send-json';
import type { BrickEvaluationFields } from '@sharpit/app/lib/validators/brick-evaluation';
import { apiFetch } from '@sharpit/ui/client/query/api-fetch';

export interface ClientBrickEvaluation {
  brickGroupId: string;
  rpe: number | null;
  transitionRating: number | null;
  feeling: string | null;
  notes: string | null;
  updatedAt: string;
}

const ENDPOINT = '/api/planned-sessions/brick/evaluation';

export function useBrickEvaluation(brickGroupId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.brickEvaluation(brickGroupId ?? ''),
    enabled: Boolean(brickGroupId),
    queryFn: async (): Promise<ClientBrickEvaluation | null> => {
      const res = await apiFetch(`${ENDPOINT}?groupId=${encodeURIComponent(brickGroupId!)}`);
      if (!res.ok) {
        throw new Error("Impossible de charger l'évaluation du brick.");
      }
      const data = (await res.json()) as { evaluation: ClientBrickEvaluation | null };
      return data.evaluation ?? null;
    },
  });
}

export function useSaveBrickEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { brickGroupId: string } & BrickEvaluationFields) => {
      const data = (await sendJson(ENDPOINT, 'PUT', input)) as {
        evaluation: ClientBrickEvaluation;
      };
      return data.evaluation;
    },
    onSuccess: (evaluation) => {
      queryClient.setQueryData(queryKeys.brickEvaluation(evaluation.brickGroupId), evaluation);
    },
  });
}
