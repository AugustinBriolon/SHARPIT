'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BodySide, PhysicalCategory, PhysicalStatus } from '@prisma/client';
import { fetchPhysicalNotes } from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';
import { listOptimistic, tempId } from '@/lib/query/optimistic';
import type { ClientPhysicalCheckin, ClientPhysicalNote } from '@/lib/query/types';

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
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(data?.error ?? 'Une erreur est survenue');
  }
  return res.json();
}

export function usePhysicalNotes() {
  return useQuery({
    queryKey: queryKeys.physicalNotes,
    queryFn: fetchPhysicalNotes,
    staleTime: 5 * 60 * 1000,
  });
}

function optimisticNote(payload: PhysicalNotePayload): ClientPhysicalNote {
  const now = new Date();
  return {
    id: tempId(),
    category: payload.category,
    status: payload.status ?? 'ACTIVE',
    title: payload.title,
    bodyPart: payload.bodyPart ?? null,
    side: payload.side ?? 'NA',
    severity: payload.severity ?? null,
    description: payload.description ?? null,
    affectsTraining: payload.affectsTraining ?? true,
    startDate: payload.startDate ?? now,
    resolvedAt: payload.resolvedAt ?? null,
    createdAt: now,
    updatedAt: now,
    checkins: [],
  } as unknown as ClientPhysicalNote;
}

export function usePhysicalNoteMutations() {
  const queryClient = useQueryClient();
  const key = queryKeys.physicalNotes;

  const create = useMutation({
    mutationFn: (payload: PhysicalNotePayload) => sendJson('/api/physical-notes', 'POST', payload),
    ...listOptimistic<ClientPhysicalNote, PhysicalNotePayload>({
      queryClient,
      queryKey: key,
      apply: (prev, payload) => [optimisticNote(payload), ...prev],
      success: 'Note ajoutée',
      error: "Impossible d'ajouter la note.",
    }),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PhysicalNotePayload> }) =>
      sendJson(`/api/physical-notes/${id}`, 'PATCH', data),
    ...listOptimistic<ClientPhysicalNote, { id: string; data: Partial<PhysicalNotePayload> }>({
      queryClient,
      queryKey: key,
      apply: (prev, { id, data }) =>
        prev.map((n) =>
          n.id === id ? ({ ...n, ...data, updatedAt: new Date() } as ClientPhysicalNote) : n,
        ),
      error: 'Impossible de mettre à jour la note.',
    }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => sendJson(`/api/physical-notes/${id}`, 'DELETE'),
    ...listOptimistic<ClientPhysicalNote, string>({
      queryClient,
      queryKey: key,
      apply: (prev, id) => prev.filter((n) => n.id !== id),
      success: 'Note supprimée',
      error: 'Impossible de supprimer la note.',
    }),
  });

  const addCheckin = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CheckinPayload }) =>
      sendJson(`/api/physical-notes/${id}/checkins`, 'POST', data),
    ...listOptimistic<ClientPhysicalNote, { id: string; data: CheckinPayload }>({
      queryClient,
      queryKey: key,
      apply: (prev, { id, data }) =>
        prev.map((n) => {
          if (n.id !== id) return n;
          const checkin = {
            id: tempId(),
            noteId: id,
            date: data.date ?? new Date(),
            severity: data.severity ?? null,
            comment: data.comment ?? null,
            createdAt: new Date(),
          } as unknown as ClientPhysicalCheckin;
          return {
            ...n,
            severity: data.severity ?? n.severity,
            checkins: [checkin, ...n.checkins],
            updatedAt: new Date(),
          } as ClientPhysicalNote;
        }),
      error: "Impossible d'enregistrer le point de suivi.",
    }),
  });

  return { create, update, remove, addCheckin };
}
