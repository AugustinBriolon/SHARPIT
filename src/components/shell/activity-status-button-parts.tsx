'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import { Drawer } from '@base-ui/react/drawer';
import { useQuery } from '@tanstack/react-query';
import { Bone, Check, Footprints, History, MapPin, Palmtree, Thermometer, X } from 'lucide-react';
import { NavArrowRight } from '@/components/icons/nav-arrows';
import {
  ACTIVITY_STATUS_OPTIONS,
  activityStatusDraftMatchesStore,
  activityStatusLabel,
  activityStatusWriteFromDraft,
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
import { fetchTravelContext } from '@/lib/query/fetchers';
import { cn } from '@/lib/utils';

export const STATUS_ICON = {
  active: Footprints,
  paused: Palmtree,
  injured: Bone,
  sick: Thermometer,
} as const;

export const STATUS_TRIGGER_CLASS: Record<ActivityStatusId, string> = {
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

export type TravelContextItem = {
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

export function travelTitle(travel: TravelContextItem): string {
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

type DraftSetters = {
  setDraftStatus: (status: ActivityStatusId) => void;
  setRetentionKind: (kind: ActivityStatusRetention['kind']) => void;
  setUntilDate: (date: string) => void;
  setTravelId: (id: string | null) => void;
  setRetentionOpen: (open: boolean) => void;
  setTravelOpen: (open: boolean) => void;
};

function syncDraftFromStore(store: ActivityStatusStore, setters: DraftSetters): void {
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

export function StatusOptionList({ draftStatus, onPickStatus }: StatusOptionListProps) {
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

type RetentionToggleProps = {
  retentionRegionId: string;
  retentionOpen: boolean;
  retentionKind: ActivityStatusRetention['kind'];
  untilDate: string;
  onToggle: () => void;
};

function RetentionToggle({
  retentionRegionId,
  retentionOpen,
  retentionKind,
  untilDate,
  onToggle,
}: RetentionToggleProps) {
  return (
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
  );
}

type RetentionOptionsProps = {
  retentionRegionId: string;
  retentionKind: ActivityStatusRetention['kind'];
  untilDate: string;
  onPickUntilModified: () => void;
  onPickUntilDate: () => void;
  onUntilDateChange: (date: string) => void;
};

function RetentionUntilModifiedOption({
  selected,
  onPick,
}: {
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm',
        'hover:bg-muted/50 transition-colors duration-150 ease-out',
        selected && 'bg-muted/60',
      )}
      onClick={onPick}
    >
      <span>Jusqu’à modification</span>
      {selected ? <Check className="size-3.5" strokeWidth={2.25} aria-hidden /> : null}
    </button>
  );
}

function RetentionUntilDateOption({
  selected,
  untilDate,
  onPick,
  onUntilDateChange,
}: {
  selected: boolean;
  untilDate: string;
  onPick: () => void;
  onUntilDateChange: (date: string) => void;
}) {
  return (
    <div className={cn('rounded-lg px-2.5 py-2', selected && 'bg-muted/60')}>
      <button
        className="flex w-full items-center justify-between text-left text-sm"
        type="button"
        onClick={onPick}
      >
        <span>Jusqu’à une date</span>
        {selected ? <Check className="size-3.5" strokeWidth={2.25} aria-hidden /> : null}
      </button>
      {selected ? (
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
  );
}

function RetentionOptions({
  retentionRegionId,
  retentionKind,
  untilDate,
  onPickUntilModified,
  onPickUntilDate,
  onUntilDateChange,
}: RetentionOptionsProps) {
  return (
    <div
      aria-label="Durée du statut"
      className="space-y-1.5 px-1 pb-2"
      id={retentionRegionId}
      role="region"
    >
      <RetentionUntilModifiedOption
        selected={retentionKind === 'until_modified'}
        onPick={onPickUntilModified}
      />
      <RetentionUntilDateOption
        selected={retentionKind === 'until_date'}
        untilDate={untilDate}
        onPick={onPickUntilDate}
        onUntilDateChange={onUntilDateChange}
      />
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

export function RetentionSection(props: RetentionSectionProps) {
  const { retentionOpen, ...optionsProps } = props;
  return (
    <>
      <RetentionToggle {...props} />
      {retentionOpen ? <RetentionOptions {...optionsProps} /> : null}
    </>
  );
}

type TravelLinkToggleProps = {
  travelOpen: boolean;
  linkedTravel: TravelContextItem | null;
  onToggle: () => void;
};

function TravelLinkToggle({ travelOpen, linkedTravel, onToggle }: TravelLinkToggleProps) {
  return (
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
  );
}

type TravelLinkPickerProps = {
  travelId: string | null;
  travels: TravelContextItem[];
  travelsPending: boolean;
  onPickTravel: (id: string) => void;
};

function TravelLinkPicker({
  travelId,
  travels,
  travelsPending,
  onPickTravel,
}: TravelLinkPickerProps) {
  return (
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

export function TravelLinkSection({
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
      <TravelLinkToggle linkedTravel={linkedTravel} travelOpen={travelOpen} onToggle={onToggle} />
      {travelOpen ? (
        <TravelLinkPicker
          travelId={travelId}
          travels={travels}
          travelsPending={travelsPending}
          onPickTravel={onPickTravel}
        />
      ) : null}
    </>
  );
}

type ActivityStatusTriggerProps = {
  status: ActivityStatusId;
  open: boolean;
  className?: string;
  onOpen: () => void;
};

export function ActivityStatusTrigger({
  status,
  open,
  className,
  onOpen,
}: ActivityStatusTriggerProps) {
  const Icon = STATUS_ICON[status];
  return (
    <button
      aria-expanded={open}
      aria-haspopup="dialog"
      type="button"
      className={cn(
        'inline-flex h-8 max-w-44 items-center gap-1.5 rounded-full border px-2.5 text-[0.8rem] font-medium',
        'transition-colors duration-150 ease-out',
        STATUS_TRIGGER_CLASS[status],
        className,
      )}
      onClick={onOpen}
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
      <span className="truncate">{activityStatusLabel(status)}</span>
    </button>
  );
}

type ActivityStatusDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftStatus: ActivityStatusId;
  retentionRegionId: string;
  retentionOpen: boolean;
  retentionKind: ActivityStatusRetention['kind'];
  untilDate: string;
  travelOpen: boolean;
  travelId: string | null;
  linkedTravel: TravelContextItem | null;
  travels: TravelContextItem[];
  travelsPending: boolean;
  onPickStatus: (id: ActivityStatusId) => void;
  onToggleRetention: () => void;
  onPickUntilModified: () => void;
  onPickUntilDate: () => void;
  onUntilDateChange: (date: string) => void;
  onToggleTravel: () => void;
  onPickTravel: (id: string) => void;
};

function ActivityStatusDrawerHeader() {
  return (
    <>
      <div className="flex justify-center pt-3" aria-hidden>
        <div className="bg-foreground/20 h-1 w-10 rounded-full" />
      </div>
      <div className="border-foreground/8 flex items-center justify-between border-b px-4 pb-3">
        <Drawer.Title className="text-sm font-semibold">Statut d’activité</Drawer.Title>
        <Drawer.Close
          render={
            <button
              aria-label="Fermer"
              className="text-muted-foreground hover:text-foreground pressable inline-flex size-11 shrink-0 items-center justify-center rounded-full"
              type="button"
            >
              <X className="size-4" aria-hidden />
            </button>
          }
        />
      </div>
    </>
  );
}

type ActivityStatusDrawerBodyProps = {
  draftStatus: ActivityStatusId;
  retentionRegionId: string;
  retentionOpen: boolean;
  retentionKind: ActivityStatusRetention['kind'];
  untilDate: string;
  travelOpen: boolean;
  travelId: string | null;
  linkedTravel: TravelContextItem | null;
  travels: TravelContextItem[];
  travelsPending: boolean;
  onPickStatus: (id: ActivityStatusId) => void;
  onToggleRetention: () => void;
  onPickUntilModified: () => void;
  onPickUntilDate: () => void;
  onUntilDateChange: (date: string) => void;
  onToggleTravel: () => void;
  onPickTravel: (id: string) => void;
};

function ActivityStatusDrawerBody(props: ActivityStatusDrawerBodyProps) {
  const { draftStatus, onPickStatus, onPickUntilModified, onPickUntilDate, ...rest } = props;
  return (
    <div className="flex-1 overflow-y-auto px-2 py-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <StatusOptionList draftStatus={draftStatus} onPickStatus={onPickStatus} />
      <div className="border-foreground/8 mt-2 border-t px-1 pt-1">
        <RetentionSection
          retentionKind={rest.retentionKind}
          retentionOpen={rest.retentionOpen}
          retentionRegionId={rest.retentionRegionId}
          untilDate={rest.untilDate}
          onPickUntilDate={onPickUntilDate}
          onPickUntilModified={onPickUntilModified}
          onToggle={rest.onToggleRetention}
          onUntilDateChange={rest.onUntilDateChange}
        />
        {draftStatus === 'paused' ? (
          <TravelLinkSection
            linkedTravel={rest.linkedTravel}
            travelId={rest.travelId}
            travelOpen={rest.travelOpen}
            travels={rest.travels}
            travelsPending={rest.travelsPending}
            onPickTravel={rest.onPickTravel}
            onToggle={rest.onToggleTravel}
          />
        ) : null}
      </div>
    </div>
  );
}

export function ActivityStatusDrawer({
  open,
  onOpenChange,
  ...bodyProps
}: ActivityStatusDrawerProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
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
            <ActivityStatusDrawerHeader />
            <ActivityStatusDrawerBody {...bodyProps} />
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function useActivityStatusStore() {
  const storeSnapshot = useSyncExternalStore(
    subscribeActivityStatus,
    getActivityStatusStoreSnapshot,
    getActivityStatusStoreServerSnapshot,
  );
  return useMemo(() => parseStoreSnapshot(storeSnapshot), [storeSnapshot]);
}

function useActivityStatusDraft(store: ActivityStatusStore) {
  const [draftStatus, setDraftStatus] = useState<ActivityStatusId>(store.status);
  const [retentionKind, setRetentionKind] = useState<ActivityStatusRetention['kind']>(
    store.retention.kind,
  );
  const [untilDate, setUntilDate] = useState(
    store.retention.kind === 'until_date' ? store.retention.untilDate : todayIsoDate(),
  );
  const [travelId, setTravelId] = useState<string | null>(store.travelId);

  return {
    draftStatus,
    setDraftStatus,
    retentionKind,
    setRetentionKind,
    untilDate,
    setUntilDate,
    travelId,
    setTravelId,
  };
}

function useTravelContextQuery(open: boolean, draftStatus: ActivityStatusId) {
  return useQuery({
    queryKey: queryKeys.travelContext,
    queryFn: async (): Promise<TravelContextResponse> =>
      (await fetchTravelContext()) as TravelContextResponse,
    enabled: open && draftStatus === 'paused',
    staleTime: 60_000,
  });
}

function useHydrateActivityStatusOnMount() {
  useEffect(() => {
    void hydrateActivityStatusFromServer();
  }, []);
}

function useSyncDraftWhenDrawerOpens(
  open: boolean,
  store: ActivityStatusStore,
  setters: DraftSetters,
  skipAutoCommitRef: MutableRefObject<boolean>,
) {
  useEffect(() => {
    if (!open) {
      return;
    }
    skipAutoCommitRef.current = true;
    syncDraftFromStore(store, setters);
    // Intentionally only when the drawer opens — not on every store write.
  }, [open]);
}

function useAutoCommitDraft(
  open: boolean,
  draft: {
    draftStatus: ActivityStatusId;
    retentionKind: ActivityStatusRetention['kind'];
    untilDate: string;
    travelId: string | null;
  },
  store: ActivityStatusStore,
  skipAutoCommitRef: MutableRefObject<boolean>,
) {
  useEffect(() => {
    if (!open) {
      return;
    }
    if (skipAutoCommitRef.current) {
      skipAutoCommitRef.current = false;
      return;
    }
    const payload = {
      status: draft.draftStatus,
      retentionKind: draft.retentionKind,
      untilDate: draft.untilDate,
      travelId: draft.travelId,
    };
    if (activityStatusDraftMatchesStore(store, payload)) {
      return;
    }
    setActivityStatus(activityStatusWriteFromDraft(payload));
  }, [open, draft.draftStatus, draft.retentionKind, draft.untilDate, draft.travelId, store]);
}

type ActivityStatusHandlers = {
  onPickStatus: (next: ActivityStatusId) => void;
  onPickTravel: (id: string) => void;
  toggleRetention: () => void;
  toggleTravel: () => void;
  onPickUntilModified: () => void;
  onPickUntilDate: () => void;
};

type ActivityStatusDraft = ReturnType<typeof useActivityStatusDraft>;

type PanelSetters = {
  setRetentionOpen: Dispatch<SetStateAction<boolean>>;
  setTravelOpen: Dispatch<SetStateAction<boolean>>;
};

function pickActivityStatus(
  draft: ActivityStatusDraft,
  setTravelOpen: Dispatch<SetStateAction<boolean>>,
  next: ActivityStatusId,
) {
  draft.setDraftStatus(next);
  if (next === 'active' || next !== 'paused') {
    draft.setTravelId(null);
    setTravelOpen(false);
  }
}

function pickLinkedTravel(draft: ActivityStatusDraft, travels: TravelContextItem[], id: string) {
  const nextId = id.length > 0 ? id : null;
  draft.setTravelId(nextId);
  if (!nextId) {
    return;
  }
  const travel = travels.find((entry) => entry.id === nextId);
  if (travel?.endDate) {
    draft.setRetentionKind('until_date');
    draft.setUntilDate(travel.endDate.slice(0, 10));
  }
}

function buildActivityStatusHandlers(
  draft: ActivityStatusDraft,
  travels: TravelContextItem[],
  panelSetters: PanelSetters,
): ActivityStatusHandlers {
  return {
    onPickStatus: (next) => pickActivityStatus(draft, panelSetters.setTravelOpen, next),
    onPickTravel: (id) => pickLinkedTravel(draft, travels, id),
    toggleRetention: () => {
      panelSetters.setRetentionOpen((prev) => !prev);
      panelSetters.setTravelOpen(false);
    },
    toggleTravel: () => {
      panelSetters.setTravelOpen((prev) => !prev);
      panelSetters.setRetentionOpen(false);
    },
    onPickUntilModified: () => {
      draft.setRetentionKind('until_modified');
      panelSetters.setRetentionOpen(false);
    },
    onPickUntilDate: () => {
      draft.setRetentionKind('until_date');
    },
  };
}

export function useActivityStatusButtonState() {
  const store = useActivityStatusStore();
  const draft = useActivityStatusDraft(store);
  const [open, setOpen] = useState(false);
  const [retentionOpen, setRetentionOpen] = useState(false);
  const [travelOpen, setTravelOpen] = useState(false);
  const retentionRegionId = useId();
  const skipAutoCommitRef = useRef(false);

  const travelsQuery = useTravelContextQuery(open, draft.draftStatus);
  const travels = travelPool(travelsQuery.data);
  const linkedTravel = travels.find((entry) => entry.id === draft.travelId) ?? null;

  useHydrateActivityStatusOnMount();
  useSyncDraftWhenDrawerOpens(
    open,
    store,
    {
      setDraftStatus: draft.setDraftStatus,
      setRetentionKind: draft.setRetentionKind,
      setUntilDate: draft.setUntilDate,
      setTravelId: draft.setTravelId,
      setRetentionOpen,
      setTravelOpen,
    },
    skipAutoCommitRef,
  );
  useAutoCommitDraft(open, draft, store, skipAutoCommitRef);

  const handlers = buildActivityStatusHandlers(draft, travels, {
    setRetentionOpen,
    setTravelOpen,
  });

  return {
    store,
    open,
    setOpen,
    retentionRegionId,
    retentionOpen,
    travelOpen,
    travels,
    linkedTravel,
    travelsPending: travelsQuery.isPending,
    ...draft,
    ...handlers,
  };
}
