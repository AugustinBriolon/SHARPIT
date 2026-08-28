'use client';

import type { AthleteEquipment } from '@/lib/equipment/types';
import { normalizeAthleteEquipment } from '@/lib/equipment/parse';
import { invalidateAfterAthleteProfileSave } from '@/lib/query/invalidate-after-athlete-profile-save';
import { queryKeys } from '@/lib/query/keys';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const SAVE_DEBOUNCE_MS = 450;

async function parseError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as {
    error?: string;
    detail?: string;
  } | null;
  return data?.detail || data?.error || "Impossible d'enregistrer l'équipement";
}

function equipmentEqual(a: AthleteEquipment, b: AthleteEquipment): boolean {
  if (a.strengthVenue !== b.strengthVenue) {
    return false;
  }
  if (a.owned.length !== b.owned.length) {
    return false;
  }
  const left = [...a.owned].sort();
  const right = [...b.owned].sort();
  return left.every((id, index) => id === right[index]);
}

type PersistRollbackContext = {
  seq: number;
  saveSeq: { current: number };
  payload: AthleteEquipment;
  rollbackEquipment: AthleteEquipment;
  previousProfile: unknown;
  queryClient: ReturnType<typeof useQueryClient>;
  err: unknown;
  setDirty: (dirty: boolean) => void;
  setEquipment: (equipment: AthleteEquipment) => void;
  setError: (error: string | null) => void;
  equipmentRef: { current: AthleteEquipment };
  dirtyRef: { current: boolean };
};

function rollbackPersistFailure(ctx: PersistRollbackContext) {
  if (ctx.seq !== ctx.saveSeq.current) {
    return;
  }
  const newerLocal = !equipmentEqual(ctx.equipmentRef.current, ctx.payload);
  if (newerLocal) {
    ctx.dirtyRef.current = true;
    ctx.setDirty(true);
    return;
  }

  ctx.dirtyRef.current = false;
  ctx.setDirty(false);
  ctx.setEquipment(ctx.rollbackEquipment);
  ctx.equipmentRef.current = ctx.rollbackEquipment;
  if (ctx.previousProfile !== undefined) {
    ctx.queryClient.setQueryData(queryKeys.athleteProfile, ctx.previousProfile);
  }
  ctx.setError(ctx.err instanceof Error ? ctx.err.message : 'Erreur');
}

function applyOptimisticEquipment(
  payload: AthleteEquipment,
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.setQueryData(queryKeys.athleteProfile, (current: unknown) => {
    if (!current || typeof current !== 'object') {
      return current;
    }
    return { ...current, equipment: payload };
  });
}

async function applySavedProfile(
  res: Response,
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
  const saved = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!saved || typeof saved !== 'object') {
    return;
  }
  queryClient.setQueryData(queryKeys.athleteProfile, (current: unknown) => {
    if (!current || typeof current !== 'object') {
      return saved;
    }
    return { ...current, ...saved };
  });
}

async function persistEquipmentPayload(
  payload: AthleteEquipment,
  queryClient: ReturnType<typeof useQueryClient>,
  router: ReturnType<typeof useRouter>,
): Promise<void> {
  const res = await fetch('/api/athlete-profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ equipment: payload }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  await applySavedProfile(res, queryClient);
  router.refresh();
  await invalidateAfterAthleteProfileSave(queryClient);
}

function schedulePersistRetry(
  timerRef: { current: ReturnType<typeof setTimeout> | null },
  flushPersist: () => Promise<void>,
) {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
  }
  timerRef.current = setTimeout(() => {
    timerRef.current = null;
    void flushPersist();
  }, SAVE_DEBOUNCE_MS);
}

type SkipPersistContext = {
  inFlight: boolean;
  dirty: boolean;
  current: AthleteEquipment;
  saved: AthleteEquipment;
  dirtyRef: { current: boolean };
  setDirty: (dirty: boolean) => void;
};

function shouldSkipPersist(ctx: SkipPersistContext): boolean {
  if (ctx.inFlight || !ctx.dirty) {
    return true;
  }
  if (equipmentEqual(ctx.current, ctx.saved)) {
    ctx.dirtyRef.current = false;
    ctx.setDirty(false);
    return true;
  }
  return false;
}

export function useEquipmentPersist(initial: AthleteEquipment) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [equipment, setEquipment] = useState<AthleteEquipment>(() =>
    normalizeAthleteEquipment(initial),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const equipmentRef = useRef(equipment);
  const savedRef = useRef(equipment);
  const dirtyRef = useRef(false);
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeq = useRef(0);

  useEffect(() => {
    equipmentRef.current = equipment;
  }, [equipment]);

  useEffect(() => {
    if (dirtyRef.current || inFlightRef.current) {
      return;
    }
    const next = normalizeAthleteEquipment(initial);
    setEquipment(next);
    savedRef.current = next;
    equipmentRef.current = next;
  }, [initial]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (!dirtyRef.current) {
        return;
      }
      void fetch('/api/athlete-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipment: equipmentRef.current }),
        keepalive: true,
      });
    };
  }, []);

  async function flushPersist() {
    if (
      shouldSkipPersist({
        inFlight: inFlightRef.current,
        dirty: dirtyRef.current,
        current: equipmentRef.current,
        saved: savedRef.current,
        dirtyRef,
        setDirty,
      })
    ) {
      return;
    }

    const seq = ++saveSeq.current;
    const payload = equipmentRef.current;
    const previousProfile = queryClient.getQueryData(queryKeys.athleteProfile);
    const rollbackEquipment = savedRef.current;

    dirtyRef.current = false;
    setDirty(false);
    inFlightRef.current = true;
    setSaving(true);
    setError(null);
    setMessage(null);
    applyOptimisticEquipment(payload, queryClient);

    let succeeded = false;
    try {
      await persistEquipmentPayload(payload, queryClient, router);
      if (seq === saveSeq.current) {
        savedRef.current = payload;
        succeeded = true;
        setMessage('Équipement enregistré.');
      }
    } catch (err) {
      rollbackPersistFailure({
        seq,
        saveSeq,
        payload,
        rollbackEquipment,
        previousProfile,
        queryClient,
        err,
        setDirty,
        setEquipment,
        setError,
        equipmentRef,
        dirtyRef,
      });
    } finally {
      if (seq === saveSeq.current) {
        inFlightRef.current = false;
        setSaving(false);
      }
    }

    if (seq !== saveSeq.current || !dirtyRef.current) {
      return;
    }

    if (succeeded) {
      void flushPersist();
      return;
    }

    schedulePersistRetry(timerRef, flushPersist);
  }

  function schedulePersist(next: AthleteEquipment) {
    dirtyRef.current = true;
    setDirty(true);
    equipmentRef.current = next;
    setError(null);
    setMessage(null);

    applyOptimisticEquipment(next, queryClient);
    schedulePersistRetry(timerRef, flushPersist);
  }

  function update(updater: (prev: AthleteEquipment) => AthleteEquipment) {
    const next = updater(equipmentRef.current);
    equipmentRef.current = next;
    setEquipment(next);
    schedulePersist(next);
  }

  return {
    equipment,
    message,
    error,
    saving,
    dirty,
    update,
  };
}
