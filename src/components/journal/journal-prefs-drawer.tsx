'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  addCustomTrackable,
  defaultJournalPrefs,
  fetchJournalPrefs,
  putJournalPrefs,
  readJournalPrefsCache,
  writeJournalPrefsCache,
  type JournalPrefs,
} from '@/lib/health/journal-prefs';
import { JOURNAL_BUILTIN_TRACKABLES, type JournalFilterId } from '@/lib/health/journal-trackables';
import { queryKeys } from '@/lib/query/keys';
import {
  JournalPrefsDrawerPanel,
  JournalPrefsOpenButton,
  type PrefsPatcher,
} from '@/components/journal/journal-prefs-drawer-parts';

function useJournalPrefsPatch(
  prefs: JournalPrefs,
  onPrefsChange: (next: JournalPrefs) => void,
): {
  patch: PrefsPatcher;
  createCustomTrackable: (label: string) => boolean;
} {
  const queryClient = useQueryClient();
  const prefsRef = useRef(prefs);
  const writeGeneration = useRef(0);
  prefsRef.current = prefs;

  function patch(updater: (prev: JournalPrefs) => JournalPrefs) {
    const next = updater(prefsRef.current);
    prefsRef.current = next;
    writeJournalPrefsCache(next);
    onPrefsChange(next);
    const generation = ++writeGeneration.current;
    void putJournalPrefs(next).then((remote) => {
      if (generation !== writeGeneration.current) {
        return;
      }
      prefsRef.current = remote;
      writeJournalPrefsCache(remote);
      onPrefsChange(remote);
      void queryClient.invalidateQueries({ queryKey: ['journal-day-signals'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.journalPrefs });
    });
  }

  function createCustomTrackable(label: string): boolean {
    const before = prefsRef.current;
    const next = addCustomTrackable(before, label);
    if (next === before) {
      return false;
    }
    patch(() => next);
    return true;
  }

  return { patch, createCustomTrackable };
}

function useJournalPrefsRows(filter: JournalFilterId, prefs: JournalPrefs) {
  const builtinRows = useMemo(() => {
    if (filter === 'personnalise') {
      return [];
    }
    return JOURNAL_BUILTIN_TRACKABLES.filter(
      (item) => filter === 'all' || item.category === filter,
    );
  }, [filter]);

  const customRows = useMemo(() => {
    if (filter !== 'all' && filter !== 'personnalise') {
      return [];
    }
    return prefs.customItems;
  }, [filter, prefs.customItems]);

  return { builtinRows, customRows };
}

export function JournalPrefsDrawer({
  prefs,
  onPrefsChange,
}: {
  prefs: JournalPrefs;
  onPrefsChange: (next: JournalPrefs) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<JournalFilterId>('all');
  const [draftLabel, setDraftLabel] = useState('');
  const { patch, createCustomTrackable } = useJournalPrefsPatch(prefs, onPrefsChange);
  const { builtinRows, customRows } = useJournalPrefsRows(filter, prefs);

  function onCreateCustom() {
    if (!createCustomTrackable(draftLabel)) {
      return;
    }
    setDraftLabel('');
    setFilter('personnalise');
  }

  return (
    <>
      <JournalPrefsOpenButton open={open} onOpen={() => setOpen(true)} />
      <JournalPrefsDrawerPanel
        builtinRows={builtinRows}
        customRows={customRows}
        draftLabel={draftLabel}
        filter={filter}
        open={open}
        patch={patch}
        prefs={prefs}
        onCreateCustom={onCreateCustom}
        onDraftLabelChange={setDraftLabel}
        onFilterChange={setFilter}
        onOpenChange={setOpen}
      />
    </>
  );
}

export function useJournalPrefs(): {
  prefs: JournalPrefs;
  setPrefs: (next: JournalPrefs) => void;
  ready: boolean;
} {
  const [prefs, setPrefs] = useState<JournalPrefs>(defaultJournalPrefs);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const local = readJournalPrefsCache();
    setPrefs(local);
    setReady(true);
    let cancelled = false;
    void fetchJournalPrefs().then((remote) => {
      if (cancelled) {
        return;
      }
      writeJournalPrefsCache(remote);
      setPrefs(remote);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { prefs, setPrefs, ready };
}
