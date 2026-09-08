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

function firstNonEmptyTravelList(data: TravelContextResponse): TravelContextItem[] | null {
  if (data.contexts && data.contexts.length > 0) {
    return data.contexts;
  }
  if (data.activeList && data.activeList.length > 0) {
    return data.activeList;
  }
  return null;
}

function travelPoolRaw(data: TravelContextResponse | undefined): TravelContextItem[] {
  if (!data) {
    return [];
  }
  const list = firstNonEmptyTravelList(data);
  if (list) {
    return list;
  }
  return data.active ? [data.active] : [];
}

function travelPool(data: TravelContextResponse | undefined): TravelContextItem[] {
  const today = todayIsoDate();
  return travelPoolRaw(data).filter((travel) => travel.endDate.slice(0, 10) >= today);
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

function retentionValueLabel(retention: ActivityStatusRetention): string {
  if (retention.kind === 'until_date') {
    return `Jusqu’au ${formatUntilDateFr(retention.untilDate)}`;
  }
  return 'Jusqu’à modification';
}

function currentRetention(store: ActivityStatusStore): ActivityStatusRetention {
  if (store.status === 'active') {
    return { kind: 'until_modified' };
  }
  return store.retention;
}

function resolveTravelRetention(
  travel: TravelContextItem | null | undefined,
  fallback: ActivityStatusRetention,
): ActivityStatusRetention {
  if (!travel?.endDate) {
    return fallback;
  }
  return { kind: 'until_date', untilDate: travel.endDate.slice(0, 10) };
}

type StatusController = {
  store: ActivityStatusStore;
  retention: ActivityStatusRetention;
  untilDate: string;
  travels: TravelContextItem[];
  linkedTravel: TravelContextItem | null;
  travelsPending: boolean;
  onPickStatus: (next: ActivityStatusId) => void;
  onPickTravel: (id: string) => void;
  pickUntilModified: () => void;
  pickUntilDate: () => void;
  onUntilDateChange: (value: string) => void;
};

function useActivityStatusController(open: boolean): StatusController {
  const storeSnapshot = useSyncExternalStore(
    subscribeActivityStatus,
    getActivityStatusStoreSnapshot,
    getActivityStatusStoreServerSnapshot,
  );
  const store = useMemo(() => parseStoreSnapshot(storeSnapshot), [storeSnapshot]);

  const retention = currentRetention(store);
  const untilDate = retention.kind === 'until_date' ? retention.untilDate : '';

  const travelsQuery = useQuery({
    queryKey: queryKeys.travelContext,
    queryFn: async (): Promise<TravelContextResponse> => {
      const res = await fetch('/api/travel-context');
      if (!res.ok) {
        throw new Error('travel context fetch failed');
      }
      return res.json();
    },
    enabled: open && store.status === 'paused',
    staleTime: 60_000,
  });
  const travels = open && store.status === 'paused' ? travelPool(travelsQuery.data) : [];
  const linkedTravel = travels.find((entry) => entry.id === store.travelId) ?? null;

  function persistNonActive(
    status: Exclude<ActivityStatusId, 'active'>,
    next: {
      retention?: ActivityStatusRetention;
      travelId?: string | null;
    } = {},
  ) {
    const nextRetention = next.retention ?? currentRetention(store);
    setActivityStatus({
      status,
      retention: nextRetention.kind === 'until_date' ? nextRetention : { kind: 'until_modified' },
      travelId:
        status === 'paused' ? (next.travelId !== undefined ? next.travelId : store.travelId) : null,
    });
  }

  function onPickStatus(next: ActivityStatusId) {
    if (next === 'active') {
      setActivityStatus({ status: 'active' });
      return;
    }
    const nextRetention =
      store.status === 'active' ? { kind: 'until_modified' as const } : currentRetention(store);
    persistNonActive(next, {
      retention: nextRetention,
      travelId: next === 'paused' ? store.travelId : null,
    });
  }

  function onPickTravel(id: string) {
    if (store.status !== 'paused') {
      return;
    }
    const nextId = id.length > 0 ? id : null;
    const travel = nextId ? travels.find((entry) => entry.id === nextId) : null;
    const nextRetention = resolveTravelRetention(travel, currentRetention(store));
    persistNonActive('paused', { travelId: nextId, retention: nextRetention });
  }

  function pickUntilModified() {
    if (store.status === 'active') {
      return;
    }
    persistNonActive(store.status, { retention: { kind: 'until_modified' } });
  }

  function pickUntilDate() {
    if (store.status === 'active') {
      return;
    }
    const date = untilDate || todayIsoDate();
    persistNonActive(store.status, {
      retention: { kind: 'until_date', untilDate: date },
    });
  }

  function onUntilDateChange(value: string) {
    if (store.status === 'active' || !value) {
      return;
    }
    persistNonActive(store.status, {
      retention: { kind: 'until_date', untilDate: value },
    });
  }

  return {
    store,
    retention,
    untilDate,
    travels,
    linkedTravel,
    travelsPending: travelsQuery.isPending,
    onPickStatus,
    onPickTravel,
    pickUntilModified,
    pickUntilDate,
    onUntilDateChange,
  };
}

function ActivityStatusOption({
  option,
  selected,
  onPick,
}: {
  option: (typeof ACTIVITY_STATUS_OPTIONS)[number];
  selected: boolean;
  onPick: (id: ActivityStatusId) => void;
}) {
  const OptionIcon = STATUS_ICON[option.id];
  return (
    <button
      aria-checked={selected}
      role="radio"
      type="button"
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left',
        'transition-colors duration-150 ease-out',
        selected ? 'bg-muted/70' : 'hover:bg-muted/40',
      )}
      onClick={() => onPick(option.id)}
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
}

function ActivityStatusOptionList({
  currentStatus,
  onPickStatus,
}: {
  currentStatus: ActivityStatusId;
  onPickStatus: (id: ActivityStatusId) => void;
}) {
  return (
    <div aria-label="Choisir un statut" className="space-y-0.5" role="radiogroup">
      {ACTIVITY_STATUS_OPTIONS.map((option) => (
        <ActivityStatusOption
          key={option.id}
          option={option}
          selected={currentStatus === option.id}
          onPick={onPickStatus}
        />
      ))}
    </div>
  );
}

function RetentionUntilDatePanel({
  untilDate,
  onPickUntilDate,
  onUntilDateChange,
}: {
  untilDate: string;
  onPickUntilDate: () => void;
  onUntilDateChange: (value: string) => void;
}) {
  return (
    <div className="bg-muted/60 rounded-lg px-2.5 py-2">
      <button
        className="flex w-full items-center justify-between text-left text-sm"
        type="button"
        onClick={onPickUntilDate}
      >
        <span>Jusqu’à une date</span>
        <Check className="size-3.5" strokeWidth={2.25} aria-hidden />
      </button>
      <input
        aria-label="Date de fin du statut"
        className="border-border bg-background text-foreground mt-2 h-9 w-full rounded-lg border px-2 text-sm"
        min={todayIsoDate()}
        type="date"
        value={untilDate || todayIsoDate()}
        onChange={(event) => onUntilDateChange(event.target.value)}
      />
    </div>
  );
}

function RetentionPicker({
  retention,
  untilDate,
  retentionOpen,
  retentionRegionId,
  onToggle,
  onPickUntilModified,
  onPickUntilDate,
  onUntilDateChange,
}: {
  retention: ActivityStatusRetention;
  untilDate: string;
  retentionOpen: boolean;
  retentionRegionId: string;
  onToggle: () => void;
  onPickUntilModified: () => void;
  onPickUntilDate: () => void;
  onUntilDateChange: (value: string) => void;
}) {
  const untilModifiedSelected = retention.kind === 'until_modified';
  const untilDateSelected = retention.kind === 'until_date';

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
          {retentionValueLabel(retention)}
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
              untilModifiedSelected && 'bg-muted/60',
            )}
            onClick={onPickUntilModified}
          >
            <span>Jusqu’à modification</span>
            {untilModifiedSelected ? (
              <Check className="size-3.5" strokeWidth={2.25} aria-hidden />
            ) : null}
          </button>
          {untilDateSelected ? (
            <RetentionUntilDatePanel
              untilDate={untilDate}
              onPickUntilDate={onPickUntilDate}
              onUntilDateChange={onUntilDateChange}
            />
          ) : (
            <div className="rounded-lg px-2.5 py-2">
              <button
                className="flex w-full items-center justify-between text-left text-sm"
                type="button"
                onClick={onPickUntilDate}
              >
                <span>Jusqu’à une date</span>
              </button>
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}

function TravelLinkPicker({
  travelOpen,
  linkedTravel,
  travels,
  travelsPending,
  travelId,
  onToggle,
  onPickTravel,
}: {
  travelOpen: boolean;
  linkedTravel: TravelContextItem | null;
  travels: TravelContextItem[];
  travelsPending: boolean;
  travelId: string | null | undefined;
  onToggle: () => void;
  onPickTravel: (id: string) => void;
}) {
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

function ActivityStatusDrawerBody({
  controller,
  retentionOpen,
  travelOpen,
  retentionRegionId,
  onToggleRetention,
  onToggleTravel,
  onPickStatusWithPanels,
  onPickUntilModifiedWithClose,
}: {
  controller: StatusController;
  retentionOpen: boolean;
  travelOpen: boolean;
  retentionRegionId: string;
  onToggleRetention: () => void;
  onToggleTravel: () => void;
  onPickStatusWithPanels: (id: ActivityStatusId) => void;
  onPickUntilModifiedWithClose: () => void;
}) {
  const showTravel = controller.store.status === 'paused';

  return (
    <div className="flex-1 overflow-y-auto px-2 py-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <ActivityStatusOptionList
        currentStatus={controller.store.status}
        onPickStatus={onPickStatusWithPanels}
      />

      <div className="border-foreground/8 mt-2 border-t px-1 pt-1">
        <RetentionPicker
          retention={controller.retention}
          retentionOpen={retentionOpen}
          retentionRegionId={retentionRegionId}
          untilDate={controller.untilDate}
          onPickUntilDate={controller.pickUntilDate}
          onPickUntilModified={onPickUntilModifiedWithClose}
          onToggle={onToggleRetention}
          onUntilDateChange={controller.onUntilDateChange}
        />

        {showTravel ? (
          <TravelLinkPicker
            linkedTravel={controller.linkedTravel}
            travelId={controller.store.travelId}
            travelOpen={travelOpen}
            travels={controller.travels}
            travelsPending={controller.travelsPending}
            onPickTravel={controller.onPickTravel}
            onToggle={onToggleTravel}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Athlete activity mode — Today (`/`) only.
 * Each change persists immediately (no commit button). Drawer stays open.
 */
export function ActivityStatusButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [retentionOpen, setRetentionOpen] = useState(false);
  const [travelOpen, setTravelOpen] = useState(false);
  const retentionRegionId = useId();
  const controller = useActivityStatusController(open);

  useEffect(() => {
    if (!open) {
      return;
    }
    setRetentionOpen(false);
    setTravelOpen(false);
  }, [open]);

  const Icon = STATUS_ICON[controller.store.status];

  function onPickStatusWithPanels(next: ActivityStatusId) {
    controller.onPickStatus(next);
    if (next !== 'paused') {
      setTravelOpen(false);
    }
  }

  function onToggleRetention() {
    setRetentionOpen((prev) => !prev);
    setTravelOpen(false);
  }

  function onToggleTravel() {
    setTravelOpen((prev) => !prev);
    setRetentionOpen(false);
  }

  function onPickUntilModifiedWithClose() {
    if (controller.store.status === 'active') {
      setRetentionOpen(false);
      return;
    }
    controller.pickUntilModified();
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
          STATUS_TRIGGER_CLASS[controller.store.status],
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <Icon className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
        <span className="truncate">{activityStatusLabel(controller.store.status)}</span>
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

              <ActivityStatusDrawerBody
                controller={controller}
                retentionOpen={retentionOpen}
                retentionRegionId={retentionRegionId}
                travelOpen={travelOpen}
                onPickStatusWithPanels={onPickStatusWithPanels}
                onPickUntilModifiedWithClose={onPickUntilModifiedWithClose}
                onToggleRetention={onToggleRetention}
                onToggleTravel={onToggleTravel}
              />
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
