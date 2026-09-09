'use client';

import { useEffect, useId, useMemo, useState, useSyncExternalStore } from 'react';
import { Drawer } from '@base-ui/react/drawer';
import { useQuery } from '@tanstack/react-query';
import { Bone, Check, Footprints, History, MapPin, Palmtree, Thermometer, X } from 'lucide-react';
import { NavArrowRight } from '@/components/icons/nav-arrows';
import {
  ACTIVITY_STATUS_OPTIONS,
  activityStatusLabel,
  type ActivityStatusId,
  type ActivityStatusRetention,
  type ActivityStatusStore,
  emptyActivityStatusStore,
  formatUntilDateFr,
  getActivityStatusStoreServerSnapshot,
  getActivityStatusStoreSnapshot,
  hydrateActivityStatusFromServer,
  setActivityStatus,
  subscribeActivityStatus,
  todayIsoDate,
} from '@/lib/health/activity-status';
import { queryKeys } from '@/lib/query/keys';
import { cn } from '@/lib/utils';

const STATUS_ICON = {
  active: Footprints,
  paused: Palmtree,
  injured: Bone,
  sick: Thermometer,
} as const;

const STATUS_TRIGGER_CLASS: Record<ActivityStatusId, string> = {
  active:
    'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300',
  paused:
    'border-amber-500/40 bg-amber-500/15 text-amber-800 hover:bg-amber-500/20 dark:text-amber-300',
  injured: 'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15',
  sick: 'border-orange-500/40 bg-orange-500/15 text-orange-800 hover:bg-orange-500/20 dark:text-orange-300',
};

const STATUS_ICON_WELL: Record<ActivityStatusId, string> = {
  active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  paused: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  injured: 'bg-destructive/10 text-destructive',
  sick: 'bg-orange-500/15 text-orange-800 dark:text-orange-300',
};

type TravelContextItem = {
  id: string;
  label: string | null;
  locationLabel: string | null;
  startDate: string;
  endDate: string;
};

type TravelContextResponse = {
  active: TravelContextItem | null;
  activeList?: TravelContextItem[];
  contexts?: TravelContextItem[];
};

function firstNonEmptyList(...lists: (TravelContextItem[] | undefined)[]): TravelContextItem[] {
  for (const list of lists) {
    if (list && list.length > 0) {
      return list;
    }
  }
  return [];
}

function rawTravelList(data: TravelContextResponse | undefined): TravelContextItem[] {
  if (!data) {
    return [];
  }
  const fromLists = firstNonEmptyList(data.contexts, data.activeList);
  if (fromLists.length > 0) {
    return fromLists;
  }
  return data.active ? [data.active] : [];
}

function travelPool(data: TravelContextResponse | undefined): TravelContextItem[] {
  const today = todayIsoDate();
  return rawTravelList(data).filter((travel) => travel.endDate.slice(0, 10) >= today);
}

function travelTitle(travel: TravelContextItem): string {
  return travel.label?.trim() || travel.locationLabel?.trim() || 'Déplacement';
}

function parseStoreSnapshot(raw: string): ActivityStatusStore {
  try {
    return JSON.parse(raw) as ActivityStatusStore;
  } catch {
    return emptyActivityStatusStore();
  }
}

function retentionValueLabel(kind: ActivityStatusRetention['kind'], untilDate: string): string {
  if (kind === 'until_date') {
    return `Jusqu’au ${formatUntilDateFr(untilDate)}`;
  }
  return 'Jusqu’à modification';
}

function buildRetention(
  kind: ActivityStatusRetention['kind'],
  untilDate: string,
): ActivityStatusRetention {
  if (kind === 'until_date') {
    return { kind: 'until_date', untilDate };
  }
  return { kind: 'until_modified' };
}

function syncDraftFromStore(
  store: ActivityStatusStore,
  setters: {
    setDraftStatus: (status: ActivityStatusId) => void;
    setRetentionKind: (kind: ActivityStatusRetention['kind']) => void;
    setUntilDate: (date: string) => void;
    setTravelId: (id: string | null) => void;
    setRetentionOpen: (open: boolean) => void;
    setTravelOpen: (open: boolean) => void;
  },
): void {
  setters.setDraftStatus(store.status);
  setters.setRetentionKind(store.retention.kind);
  setters.setUntilDate(
    store.retention.kind === 'until_date' ? store.retention.untilDate : todayIsoDate(),
  );
  setters.setTravelId(store.travelId);
  setters.setRetentionOpen(false);
  setters.setTravelOpen(false);
}

type StatusOptionListProps = {
  draftStatus: ActivityStatusId;
  onPickStatus: (id: ActivityStatusId) => void;
};

function StatusOptionList({ draftStatus, onPickStatus }: StatusOptionListProps) {
  return (
    <div aria-label="Choisir un statut" className="space-y-0.5" role="radiogroup">
      {ACTIVITY_STATUS_OPTIONS.map((option) => {
        const selected = draftStatus === option.id;
        const OptionIcon = STATUS_ICON[option.id];
        return (
          <button
            key={option.id}
            aria-checked={selected}
            role="radio"
            type="button"
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left',
              'transition-colors duration-150 ease-out',
              selected ? 'bg-muted/70' : 'hover:bg-muted/40',
            )}
            onClick={() => onPickStatus(option.id)}
          >
            <span
              className={cn(
                'inline-flex size-9 shrink-0 items-center justify-center rounded-xl',
                STATUS_ICON_WELL[option.id],
              )}
            >
              <OptionIcon className="size-4" strokeWidth={1.8} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-foreground block text-sm font-medium">{option.label}</span>
              <span className="text-muted-foreground mt-0.5 block text-xs text-pretty">
                {option.hint}
              </span>
            </span>
            {selected ? (
              <Check className="text-foreground size-4 shrink-0" strokeWidth={2.25} aria-hidden />
            ) : (
              <span className="size-4 shrink-0" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}

type RetentionSectionProps = {
  retentionRegionId: string;
  retentionOpen: boolean;
  retentionKind: ActivityStatusRetention['kind'];
  untilDate: string;
  onToggle: () => void;
  onPickUntilModified: () => void;
  onPickUntilDate: () => void;
  onUntilDateChange: (date: string) => void;
};

function RetentionSection({
  retentionRegionId,
  retentionOpen,
  retentionKind,
  untilDate,
  onToggle,
  onPickUntilModified,
  onPickUntilDate,
  onUntilDateChange,
}: RetentionSectionProps) {
  return (
    <>
      <button
        aria-controls={retentionRegionId}
        aria-expanded={retentionOpen}
        type="button"
        className={cn(
          'text-muted-foreground hover:text-foreground',
          'flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left',
          'transition-colors duration-150 ease-out',
        )}
        onClick={onToggle}
      >
        <History className="size-4 shrink-0 opacity-70" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0 flex-1 text-sm">Conserver le statut</span>
        <span className="max-w-40 truncate text-sm opacity-80">
          {retentionValueLabel(retentionKind, untilDate)}
        </span>
        <NavArrowRight
          className={cn(
            'size-3.5 shrink-0 opacity-50 transition-transform duration-150 ease-out',
            retentionOpen && 'rotate-90',
          )}
          aria-hidden
        />
      </button>

      {retentionOpen ? (
        <div
          aria-label="Durée du statut"
          className="space-y-1.5 px-1 pb-2"
          id={retentionRegionId}
          role="region"
        >
          <button
            type="button"
            className={cn(
              'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm',
              'hover:bg-muted/50 transition-colors duration-150 ease-out',
              retentionKind === 'until_modified' && 'bg-muted/60',
            )}
            onClick={onPickUntilModified}
          >
            <span>Jusqu’à modification</span>
            {retentionKind === 'until_modified' ? (
              <Check className="size-3.5" strokeWidth={2.25} aria-hidden />
            ) : null}
          </button>
          <div
            className={cn(
              'rounded-lg px-2.5 py-2',
              retentionKind === 'until_date' && 'bg-muted/60',
            )}
          >
            <button
              className="flex w-full items-center justify-between text-left text-sm"
              type="button"
              onClick={onPickUntilDate}
            >
              <span>Jusqu’à une date</span>
              {retentionKind === 'until_date' ? (
                <Check className="size-3.5" strokeWidth={2.25} aria-hidden />
              ) : null}
            </button>
            {retentionKind === 'until_date' ? (
              <input
                aria-label="Date de fin du statut"
                className="border-border bg-background text-foreground mt-2 h-9 w-full rounded-lg border px-2 text-sm"
                min={todayIsoDate()}
                type="date"
                value={untilDate}
                onChange={(event) => onUntilDateChange(event.target.value)}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

type TravelLinkSectionProps = {
  travelOpen: boolean;
  travelId: string | null;
  linkedTravel: TravelContextItem | null;
  travels: TravelContextItem[];
  travelsPending: boolean;
  onToggle: () => void;
  onPickTravel: (id: string) => void;
};

function TravelLinkSection({
  travelOpen,
  travelId,
  linkedTravel,
  travels,
  travelsPending,
  onToggle,
  onPickTravel,
}: TravelLinkSectionProps) {
  return (
    <>
      <button
        aria-expanded={travelOpen}
        type="button"
        className={cn(
          'text-muted-foreground hover:text-foreground',
          'flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left',
          'transition-colors duration-150 ease-out',
        )}
        onClick={onToggle}
      >
        <MapPin className="size-4 shrink-0 opacity-70" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0 flex-1 text-sm">Lier à un déplacement</span>
        <span className="max-w-40 truncate text-sm opacity-80">
          {linkedTravel ? travelTitle(linkedTravel) : 'Aucun'}
        </span>
        <NavArrowRight
          className={cn(
            'size-3.5 shrink-0 opacity-50 transition-transform duration-150 ease-out',
            travelOpen && 'rotate-90',
          )}
          aria-hidden
        />
      </button>
      {travelOpen ? (
        <div className="px-1 pb-2">
          <select
            aria-label="Déplacement lié"
            className="border-border bg-background text-foreground h-9 w-full rounded-lg border px-2 text-sm"
            value={travelId ?? ''}
            onChange={(event) => onPickTravel(event.target.value)}
          >
            <option value="">Aucun déplacement</option>
            {travels.map((travel) => (
              <option key={travel.id} value={travel.id}>
                {travelTitle(travel)}
              </option>
            ))}
          </select>
          {travels.length === 0 && !travelsPending ? (
            <p className="text-muted-foreground mt-1.5 px-0.5 text-xs">
              Aucun déplacement enregistré. Ajoute-en un dans Mémoire.
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/**
 * Athlete activity mode — Today (`/`) only.
 * Status pick stays open; commit via muted « Mettre à jour ».
 * Retention is a quiet row that discloses calendar options on tap.
 */
export function ActivityStatusButton({ className }: { className?: string }) {
  const storeSnapshot = useSyncExternalStore(
    subscribeActivityStatus,
    getActivityStatusStoreSnapshot,
    getActivityStatusStoreServerSnapshot,
  );
  const store = useMemo(() => parseStoreSnapshot(storeSnapshot), [storeSnapshot]);
  const [open, setOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState<ActivityStatusId>(store.status);
  const [retentionKind, setRetentionKind] = useState<ActivityStatusRetention['kind']>(
    store.retention.kind,
  );
  const [untilDate, setUntilDate] = useState(
    store.retention.kind === 'until_date' ? store.retention.untilDate : todayIsoDate(),
  );
  const [travelId, setTravelId] = useState<string | null>(store.travelId);
  const [retentionOpen, setRetentionOpen] = useState(false);
  const [travelOpen, setTravelOpen] = useState(false);
  const retentionRegionId = useId();

  const travelsQuery = useQuery({
    queryKey: queryKeys.travelContext,
    queryFn: async (): Promise<TravelContextResponse> => {
      const res = await fetch('/api/travel-context');
      if (!res.ok) {
        throw new Error('travel context fetch failed');
      }
      return res.json();
    },
    enabled: open && draftStatus === 'paused',
    staleTime: 60_000,
  });
  const travels = travelPool(travelsQuery.data);
  const linkedTravel = travels.find((entry) => entry.id === travelId) ?? null;

  useEffect(() => {
    void hydrateActivityStatusFromServer();
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    syncDraftFromStore(store, {
      setDraftStatus,
      setRetentionKind,
      setUntilDate,
      setTravelId,
      setRetentionOpen,
      setTravelOpen,
    });
  }, [open, store]);

  const Icon = STATUS_ICON[store.status];

  function applyDraft() {
    if (draftStatus === 'active') {
      setActivityStatus({ status: 'active' });
      setOpen(false);
      return;
    }
    setActivityStatus({
      status: draftStatus,
      retention: buildRetention(retentionKind, untilDate),
      travelId: draftStatus === 'paused' ? travelId : null,
    });
    setOpen(false);
  }

  function onPickStatus(next: ActivityStatusId) {
    setDraftStatus(next);
    if (next === 'active' || next !== 'paused') {
      setTravelId(null);
      setTravelOpen(false);
    }
  }

  function onPickTravel(id: string) {
    const nextId = id.length > 0 ? id : null;
    setTravelId(nextId);
    if (!nextId) {
      return;
    }
    const travel = travels.find((entry) => entry.id === nextId);
    if (travel?.endDate) {
      setRetentionKind('until_date');
      setUntilDate(travel.endDate.slice(0, 10));
    }
  }

  function toggleRetention() {
    setRetentionOpen((prev) => !prev);
    setTravelOpen(false);
  }

  function toggleTravel() {
    setTravelOpen((prev) => !prev);
    setRetentionOpen(false);
  }

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        type="button"
        className={cn(
          'inline-flex h-8 max-w-44 items-center gap-1.5 rounded-lg border px-2.5 text-[0.8rem] font-medium',
          'transition-colors duration-150 ease-out',
          STATUS_TRIGGER_CLASS[store.status],
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <Icon className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
        <span className="truncate">{activityStatusLabel(store.status)}</span>
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
                'bg-background flex max-h-[min(92dvh,36rem)] flex-col rounded-t-2xl',
                'transition-transform duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]',
                'starting:translate-y-full',
                'data-closed:translate-y-full data-closed:duration-150 data-closed:ease-out',
              )}
            >
              <div className="flex justify-center pt-3 pb-1" aria-hidden>
                <div className="bg-foreground/20 h-1 w-10 rounded-full" />
              </div>

              <div className="border-foreground/8 flex items-center justify-between border-b px-4 py-3">
                <Drawer.Title className="text-sm font-semibold">Statut d’activité</Drawer.Title>
                <Drawer.Close
                  render={
                    <button
                      aria-label="Fermer"
                      className="text-muted-foreground hover:text-foreground pressable inline-flex size-11 shrink-0 items-center justify-center rounded-lg"
                      type="button"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  }
                />
              </div>

              <div className="flex-1 overflow-y-auto px-2 py-2">
                <StatusOptionList draftStatus={draftStatus} onPickStatus={onPickStatus} />

                <div className="border-foreground/8 mt-2 border-t px-1 pt-1">
                  <RetentionSection
                    retentionKind={retentionKind}
                    retentionOpen={retentionOpen}
                    retentionRegionId={retentionRegionId}
                    untilDate={untilDate}
                    onPickUntilDate={() => setRetentionKind('until_date')}
                    onToggle={toggleRetention}
                    onUntilDateChange={setUntilDate}
                    onPickUntilModified={() => {
                      setRetentionKind('until_modified');
                      setRetentionOpen(false);
                    }}
                  />

                  {draftStatus === 'paused' ? (
                    <TravelLinkSection
                      linkedTravel={linkedTravel}
                      travelId={travelId}
                      travelOpen={travelOpen}
                      travels={travels}
                      travelsPending={travelsQuery.isPending}
                      onPickTravel={onPickTravel}
                      onToggle={toggleTravel}
                    />
                  ) : null}
                </div>
              </div>

              <div className="px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  className={cn(
                    'bg-muted/80 text-foreground hover:bg-muted',
                    'inline-flex h-11 w-full items-center justify-center rounded-full text-sm font-medium',
                    'transition-colors duration-150 ease-out active:scale-[0.98]',
                  )}
                  onClick={applyDraft}
                >
                  Mettre à jour
                </button>
              </div>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
