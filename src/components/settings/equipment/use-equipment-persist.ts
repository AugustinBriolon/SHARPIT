'use client';

import type { AthleteEquipment } from '@/lib/equipment/types';
import { normalizeAthleteEquipment } from '@/lib/equipment/parse';
import { queryKeys } from '@/lib/query/keys';
import { useQueryClient } from '@tanstack/react-query';
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
  if (a.strengthVenue !== b.strengthVenue) return false;
  if (a.owned.length !== b.owned.length) return false;
  const left = [...a.owned].sort();
  const right = [...b.owned].sort();
  return left.every((id, index) => id === right[index]);
}

export function useEquipmentPersist(initial: AthleteEquipment) {
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
    if (dirtyRef.current || inFlightRef.current) return;
    const next = normalizeAthleteEquipment(initial);
    setEquipment(next);
    savedRef.current = next;
    equipmentRef.current = next;
  }, [initial]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (!dirtyRef.current) return;
      void fetch('/api/athlete-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipment: equipmentRef.current }),
        keepalive: true,
      });
    };
  }, []);

  async function flushPersist() {
    if (inFlightRef.current) return;
    if (!dirtyRef.current) return;
    if (equipmentEqual(equipmentRef.current, savedRef.current)) {
      dirtyRef.current = false;
      setDirty(false);
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

    queryClient.setQueryData(queryKeys.athleteProfile, (current: unknown) => {
      if (!current || typeof current !== 'object') return current;
      return { ...current, equipment: payload };
    });

    let succeeded = false;
    try {
      const res = await fetch('/api/athlete-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipment: payload }),
      });
      if (!res.ok) throw new Error(await parseError(res));

      if (seq === saveSeq.current) {
        savedRef.current = payload;
        succeeded = true;
        setMessage('Équipement enregistré.');
        void queryClient.invalidateQueries({ queryKey: queryKeys.athleteProfile });
      }
    } catch (err) {
      if (seq === saveSeq.current) {
        const newerLocal = !equipmentEqual(equipmentRef.current, payload);
        if (newerLocal) {
          dirtyRef.current = true;
          setDirty(true);
        } else {
          dirtyRef.current = false;
          setDirty(false);
          setEquipment(rollbackEquipment);
          equipmentRef.current = rollbackEquipment;
          if (previousProfile !== undefined) {
            queryClient.setQueryData(queryKeys.athleteProfile, previousProfile);
          }
        }
        setError(err instanceof Error ? err.message : 'Erreur');
      }
    } finally {
      if (seq === saveSeq.current) {
        inFlightRef.current = false;
        setSaving(false);
      }
    }

    if (seq !== saveSeq.current || !dirtyRef.current) return;

    if (succeeded) {
      void flushPersist();
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flushPersist();
    }, SAVE_DEBOUNCE_MS);
  }

  function schedulePersist(next: AthleteEquipment) {
    dirtyRef.current = true;
    setDirty(true);
    equipmentRef.current = next;
    setError(null);
    setMessage(null);

    queryClient.setQueryData(queryKeys.athleteProfile, (current: unknown) => {
      if (!current || typeof current !== 'object') return current;
      return { ...current, equipment: next };
    });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flushPersist();
    }, SAVE_DEBOUNCE_MS);
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
