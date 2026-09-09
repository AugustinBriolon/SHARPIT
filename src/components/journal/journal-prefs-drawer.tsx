'use client';

import { useEffect, useMemo, useState } from 'react';
import { Drawer } from '@base-ui/react/drawer';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  addCustomTrackable,
  defaultJournalPrefs,
  fetchJournalPrefs,
  putJournalPrefs,
  readJournalPrefsCache,
  removeCustomTrackable,
  setCustomTrackableEnabled,
  setTrackableEnabled,
  writeJournalPrefsCache,
  type JournalPrefs,
} from '@/lib/health/journal-prefs';
import {
  CUSTOM_FACTOR_ICON,
  JOURNAL_BUILTIN_TRACKABLES,
  JOURNAL_FILTER_IDS,
  JOURNAL_FILTER_LABELS,
  type JournalBuiltinTrackableId,
  type JournalFilterId,
} from '@/lib/health/journal-trackables';
import { queryKeys } from '@/lib/query/keys';
import { cn } from '@/lib/utils';

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
  const queryClient = useQueryClient();

  function patch(next: JournalPrefs) {
    writeJournalPrefsCache(next);
    onPrefsChange(next);
    void putJournalPrefs(next).then((remote) => {
      writeJournalPrefsCache(remote);
      onPrefsChange(remote);
      void queryClient.invalidateQueries({ queryKey: ['journal-day-signals'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.journalPrefs });
    });
  }

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

  function onCreateCustom() {
    const next = addCustomTrackable(prefs, draftLabel);
    if (next === prefs) {
      return;
    }
    setDraftLabel('');
    setFilter('personnalise');
    patch(next);
  }

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        type="button"
        className={cn(
          'border-border bg-background text-foreground hover:bg-muted inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5',
          'text-[0.8rem] font-medium transition-colors',
        )}
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal className="size-3.5" strokeWidth={1.8} aria-hidden />
        Personnaliser
      </button>

      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Backdrop
            className={cn(
              'bg-foreground/40 fixed inset-0 z-60',
              'transition-opacity duration-250 ease-out',
              'data-closed:opacity-0 data-closed:duration-150',
            )}
          />
          <Drawer.Viewport className="fixed inset-0 z-61 flex flex-col justify-end">
            <Drawer.Popup
              className={cn(
                'bg-background flex h-[min(94dvh,44rem)] flex-col rounded-t-2xl',
                'transition-transform duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]',
                'starting:translate-y-full',
                'data-closed:translate-y-full data-closed:duration-150 data-closed:ease-out',
              )}
            >
              <div className="border-border flex items-center justify-between border-b px-4 py-3">
                <Drawer.Title className="text-sm font-semibold">Éléments du journal</Drawer.Title>
                <Drawer.Close
                  aria-label="Fermer"
                  className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-8 items-center justify-center rounded-lg"
                >
                  <X className="size-4" aria-hidden />
                </Drawer.Close>
              </div>

              <div className="border-border overflow-x-auto border-b px-3 py-2">
                <div aria-label="Filtres" className="flex w-max gap-1.5" role="tablist">
                  {JOURNAL_FILTER_IDS.map((id) => {
                    const active = filter === id;
                    return (
                      <button
                        key={id}
                        aria-selected={active}
                        role="tab"
                        type="button"
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[0.7rem] font-medium whitespace-nowrap transition-colors',
                          active
                            ? 'bg-foreground text-background'
                            : 'bg-muted text-muted-foreground hover:text-foreground',
                        )}
                        onClick={() => setFilter(id)}
                      >
                        {JOURNAL_FILTER_LABELS[id]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <ul className="divide-border divide-y">
                  {builtinRows.map((item) => {
                    const Icon = item.icon;
                    const checked = prefs.enabled[item.id];
                    return (
                      <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="bg-muted text-muted-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-xl">
                          <Icon className="size-4" strokeWidth={1.8} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-medium">{item.label}</span>
                        <Switch
                          checked={checked}
                          onCheckedChange={(value) =>
                            patch(
                              setTrackableEnabled(
                                prefs,
                                item.id as JournalBuiltinTrackableId,
                                value,
                              ),
                            )
                          }
                        />
                      </li>
                    );
                  })}

                  {customRows.map((item) => {
                    const Icon = CUSTOM_FACTOR_ICON;
                    return (
                      <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="bg-muted text-muted-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-xl">
                          <Icon className="size-4" strokeWidth={1.8} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-medium">{item.label}</span>
                        <button
                          aria-label={`Supprimer ${item.label}`}
                          className="text-muted-foreground hover:text-destructive inline-flex size-8 items-center justify-center rounded-lg"
                          type="button"
                          onClick={() => patch(removeCustomTrackable(prefs, item.id))}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                        <Switch
                          checked={item.enabled}
                          onCheckedChange={(value) =>
                            patch(setCustomTrackableEnabled(prefs, item.id, value))
                          }
                        />
                      </li>
                    );
                  })}
                </ul>

                {builtinRows.length === 0 && customRows.length === 0 ? (
                  <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                    Aucun élément dans ce filtre.
                  </p>
                ) : null}
              </div>

              {(filter === 'all' || filter === 'personnalise') && (
                <div className="border-border flex gap-2 border-t px-4 py-3">
                  <Input
                    aria-label="Nouvel élément personnalisé"
                    className="h-9"
                    maxLength={48}
                    placeholder="Créer un élément…"
                    value={draftLabel}
                    onChange={(event) => setDraftLabel(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        onCreateCustom();
                      }
                    }}
                  />
                  <Button
                    className="shrink-0"
                    disabled={draftLabel.trim().length < 1}
                    size="sm"
                    type="button"
                    onClick={onCreateCustom}
                  >
                    <Plus className="size-4" aria-hidden />
                    Ajouter
                  </Button>
                </div>
              )}
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
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
