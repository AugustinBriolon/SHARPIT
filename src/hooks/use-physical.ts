"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BodySide,
  PhysicalCategory,
  PhysicalStatus,
} from "@prisma/client";
import { fetchPhysicalNotes } from "@/lib/client/fetchers";
import { queryKeys } from "@/lib/client/keys";

export interface PhysicalNotePayload {
  category: PhysicalCategory;
  status?: PhysicalStatus;
  title: string;
  bodyPart?: string | null;
  side?: BodySide;
  severity?: number | null;
  description?: string | null;
  affectsTraining?: boolean;
  startDate?: Date;
  resolvedAt?: Date | null;
}

export interface CheckinPayload {
  severity?: number | null;
  comment?: string | null;
  date?: Date;
}

async function sendJson(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(data?.error ?? "Une erreur est survenue");
  }
  return res.json();
}

export function usePhysicalNotes() {
  return useQuery({
    queryKey: queryKeys.physicalNotes,
    queryFn: fetchPhysicalNotes,
  });
}

export function usePhysicalNoteMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.physicalNotes });

  const create = useMutation({
    mutationFn: (payload: PhysicalNotePayload) =>
      sendJson("/api/physical-notes", "POST", payload),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<PhysicalNotePayload>;
    }) => sendJson(`/api/physical-notes/${id}`, "PATCH", data),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => sendJson(`/api/physical-notes/${id}`, "DELETE"),
    onSuccess: invalidate,
  });

  const addCheckin = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CheckinPayload }) =>
      sendJson(`/api/physical-notes/${id}/checkins`, "POST", data),
    onSuccess: invalidate,
  });

  return { create, update, remove, addCheckin };
}
