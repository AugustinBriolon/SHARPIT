'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import {
  addCustomTrackable,
  defaultJournalPrefs,
  fetchJournalPrefs,
  putJournalPrefs,
  readJournalPrefsCache,
  writeJournalPrefsCache,
  type JournalPrefs,
} from '@sharpit/app/lib/journal/journal-prefs';
import {
  JOURNAL_BUILTIN_TRACKABLES,
  JOURNAL_PREFS_DEEP_LINK_PARAM,
  journalPrefsDeepLinkFilter,
  type JournalFilterId,
} from '@sharpit/app/lib/journal/journal-trackables';
import { queryKeys } from '@/client/query/keys';
import {
  JournalPrefsDrawerPanel,
  JournalPrefsOpenButton,
  type PrefsPatcher,
} from '@/components/journal/journal-prefs-drawer-parts';

function useJournalPrefsPatch(
  prefs: JournalPrefs,
  isPro: boolean,
  onPrefsChange: (next: JournalPrefs) => void,
  onIsProChange: (next: boolean) => void,
): {
  patch: PrefsPatcher;
  createCustomTrackable: (label: string) => boolean;
} {
  const queryClient = useQueryClient();
  const prefsRef = useRef(prefs);
  const isProRef = useRef(isPro);
  const writeGeneration = useRef(0);
  prefsRef.current = prefs;
  isProRef.current = isPro;

  function apply(next: JournalPrefs) {
    prefsRef.current = next;
    writeJournalPrefsCache(next);
    onPrefsChange(next);
  }

  function patch(updater: (prev: JournalPrefs) => JournalPrefs) {
    const previous = prefsRef.current;
    apply(updater(previous));
    const generation = ++writeGeneration.current;
    putJournalPrefs(prefsRef.current)
      .then((remote) => {
        if (generation !== writeGeneration.current) {
          return;
        }
        apply(remote.prefs);
        onIsProChange(remote.isPro);
        void queryClient.invalidateQueries({ queryKey: ['journal-day-signals'] });
        void queryClient.invalidateQueries({ queryKey: queryKeys.journalPrefs });
      })
      .catch(() => {
        // Not saved: the choice shown would be a lie — put back what the server still holds.
        if (generation !== writeGeneration.current) {
          return;
        }
        apply(previous);
        toast.error('Préférence non enregistrée. Réessaie dans un instant.');
      });
  }

  function createCustomTrackable(label: string): boolean {
    const before = prefsRef.current;
    const next = addCustomTrackable(before, label, isProRef.current);
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

/**
 * Opens the drawer when another surface deep-links into it (the nutrition diet
 * tag), then drops the param so a reload does not reopen it. Read from
 * `window.location` on mount: the journal page has no Suspense boundary for
 * `useSearchParams`, and the drawer is closed in the server render anyway.
 */
function useJournalPrefsDeepLink(open: (filter: JournalFilterId) => void) {
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => {
    const filter = journalPrefsDeepLinkFilter(window.location.search);
    if (!filter) {
      return;
    }
    openRef.current(filter);
    const url = new URL(window.location.href);
    url.searchParams.delete(JOURNAL_PREFS_DEEP_LINK_PARAM);
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  }, []);
}

export function JournalPrefsDrawer({
  prefs,
  isPro,
  onPrefsChange,
  onIsProChange,
}: {
  prefs: JournalPrefs;
  isPro: boolean;
  onPrefsChange: (next: JournalPrefs) => void;
  onIsProChange: (next: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<JournalFilterId>('all');
  const [draftLabel, setDraftLabel] = useState('');
  const { patch, createCustomTrackable } = useJournalPrefsPatch(
    prefs,
    isPro,
    onPrefsChange,
    onIsProChange,
  );
  const { builtinRows, customRows } = useJournalPrefsRows(filter, prefs);
  useJournalPrefsDeepLink((deepLinkFilter) => {
    setFilter(deepLinkFilter);
    setOpen(true);
  });

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
        isPro={isPro}
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
  isPro: boolean;
  setIsPro: (next: boolean) => void;
  ready: boolean;
} {
  const [prefs, setPrefs] = useState<JournalPrefs>(defaultJournalPrefs);
  const [isPro, setIsPro] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const local = readJournalPrefsCache();
    setPrefs(local);
    setReady(true);
    let cancelled = false;
    fetchJournalPrefs()
      .then((remote) => {
        if (cancelled) {
          return;
        }
        writeJournalPrefsCache(remote.prefs);
        setPrefs(remote.prefs);
        setIsPro(remote.isPro);
      })
      // Unreachable for now: the cached choices stay on screen and the next open reads again.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return { prefs, setPrefs, isPro, setIsPro, ready };
}
