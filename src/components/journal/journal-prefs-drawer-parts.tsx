'use client';

import type { ReactNode } from 'react';
import { Drawer } from '@base-ui/react/drawer';
import { Plus, SlidersHorizontal, Sparkles, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  removeCustomTrackable,
  setCustomTrackableEnabled,
  setTrackableEnabled,
  type JournalCustomItem,
  type JournalPrefs,
} from '@/lib/health/journal-prefs';
import { canEnableAnotherTrackable } from '@/lib/health/journal-limits';
import { JOURNAL_CATEGORY_ICON, JOURNAL_FILTER_CHIP } from '@/lib/health/journal-category-surface';
import {
  CUSTOM_FACTOR_ICON,
  JOURNAL_FILTER_IDS,
  JOURNAL_FILTER_LABELS,
  type JournalBuiltinTrackable,
  type JournalBuiltinTrackableId,
  type JournalFilterId,
} from '@/lib/health/journal-trackables';
import { cn } from '@/lib/utils';
import { LinkButton } from '@/components/ui/link-button';

export type PrefsPatcher = (updater: (prev: JournalPrefs) => JournalPrefs) => void;

export function JournalPrefsOpenButton({ open, onOpen }: { open: boolean; onOpen: () => void }) {
  return (
    <button
      aria-expanded={open}
      aria-haspopup="dialog"
      type="button"
      className={cn(
        'border-border bg-background text-foreground hover:bg-muted inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-2.5',
        'text-[0.8rem] font-medium transition-colors',
      )}
      onClick={onOpen}
    >
      <SlidersHorizontal className="size-3.5" strokeWidth={1.8} aria-hidden />
      Personnaliser
    </button>
  );
}

function JournalPrefsDrawerHeader() {
  return (
    <div className="border-border flex items-center justify-between border-b px-4 py-3">
      <Drawer.Title className="text-sm font-semibold">Éléments du journal</Drawer.Title>
      <Drawer.Close
        aria-label="Fermer"
        className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-8 cursor-pointer items-center justify-center rounded-lg"
      >
        <X className="size-4" aria-hidden />
      </Drawer.Close>
    </div>
  );
}

function JournalPrefsFilterTabs({
  filter,
  onFilterChange,
}: {
  filter: JournalFilterId;
  onFilterChange: (id: JournalFilterId) => void;
}) {
  return (
    <div className="border-border overflow-x-auto border-b px-3 py-2">
      <div aria-label="Filtres" className="flex w-max gap-1.5" role="tablist">
        {JOURNAL_FILTER_IDS.map((id) => {
          const active = filter === id;
          const tone = JOURNAL_FILTER_CHIP[id];
          return (
            <button
              key={id}
              aria-selected={active}
              role="tab"
              type="button"
              className={cn(
                'cursor-pointer rounded-full px-2.5 py-1 text-[0.7rem] font-medium whitespace-nowrap transition-colors',
                active ? tone.active : tone.idle,
              )}
              onClick={() => onFilterChange(id)}
            >
              {JOURNAL_FILTER_LABELS[id]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BuiltinTrackableRow({
  item,
  checked,
  isPro,
  enableBlocked,
  patch,
}: {
  item: JournalBuiltinTrackable;
  checked: boolean;
  isPro: boolean;
  enableBlocked: boolean;
  patch: PrefsPatcher;
}) {
  const Icon = item.icon;
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span
        className={cn(
          'inline-flex size-9 shrink-0 items-center justify-center rounded-xl',
          JOURNAL_CATEGORY_ICON[item.category],
        )}
      >
        <Icon className="size-4" strokeWidth={1.8} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium">{item.label}</span>
      <Switch
        checked={checked}
        disabled={!checked && enableBlocked}
        onCheckedChange={(value) =>
          patch((prev) =>
            setTrackableEnabled(prev, item.id as JournalBuiltinTrackableId, value, isPro),
          )
        }
      />
    </li>
  );
}

function CustomTrackableRow({
  item,
  isPro,
  enableBlocked,
  patch,
}: {
  item: JournalCustomItem;
  isPro: boolean;
  enableBlocked: boolean;
  patch: PrefsPatcher;
}) {
  const Icon = CUSTOM_FACTOR_ICON;
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span
        className={cn(
          'inline-flex size-9 shrink-0 items-center justify-center rounded-xl',
          JOURNAL_CATEGORY_ICON.personnalise,
        )}
      >
        <Icon className="size-4" strokeWidth={1.8} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium">{item.label}</span>
      <button
        aria-label={`Supprimer ${item.label}`}
        className="text-muted-foreground hover:text-destructive inline-flex size-8 cursor-pointer items-center justify-center rounded-lg"
        type="button"
        onClick={() => patch((prev) => removeCustomTrackable(prev, item.id))}
      >
        <Trash2 className="size-3.5" aria-hidden />
      </button>
      <Switch
        checked={item.enabled}
        disabled={!item.enabled && enableBlocked}
        onCheckedChange={(value) =>
          patch((prev) => setCustomTrackableEnabled(prev, item.id, value, isPro))
        }
      />
    </li>
  );
}

function JournalPrefsTrackableList({
  prefs,
  builtinRows,
  customRows,
  isPro,
  patch,
}: {
  prefs: JournalPrefs;
  builtinRows: readonly JournalBuiltinTrackable[];
  customRows: readonly JournalCustomItem[];
  isPro: boolean;
  patch: PrefsPatcher;
}) {
  const isEmpty = builtinRows.length === 0 && customRows.length === 0;
  const enableBlocked = !canEnableAnotherTrackable(prefs, isPro);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <ul className="divide-border divide-y">
        {builtinRows.map((item) => (
          <BuiltinTrackableRow
            key={item.id}
            checked={prefs.enabled[item.id]}
            enableBlocked={enableBlocked}
            isPro={isPro}
            item={item}
            patch={patch}
          />
        ))}
        {customRows.map((item) => (
          <CustomTrackableRow
            key={item.id}
            enableBlocked={enableBlocked}
            isPro={isPro}
            item={item}
            patch={patch}
          />
        ))}
      </ul>
      {isEmpty ? (
        <p className="text-muted-foreground px-4 py-8 text-center text-sm">
          Aucun élément dans ce filtre.
        </p>
      ) : null}
    </div>
  );
}

function JournalPrefsProUpsellFooter() {
  return (
    <div className="border-border shrink-0 space-y-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <p className="text-muted-foreground text-xs text-pretty">
        Les éléments personnalisés sont réservés à Pro.
      </p>
      <LinkButton href="/settings/pro" size="sm" variant="outline">
        <Sparkles className="size-3.5" aria-hidden />
        Voir Pro
      </LinkButton>
    </div>
  );
}

function JournalPrefsCustomCreateForm({
  draftLabel,
  enableBlocked,
  onDraftLabelChange,
  onCreateCustom,
}: {
  draftLabel: string;
  enableBlocked: boolean;
  onDraftLabelChange: (value: string) => void;
  onCreateCustom: () => void;
}) {
  return (
    <div className="border-border flex shrink-0 gap-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <Input
        aria-label="Nouvel élément personnalisé"
        className="h-9"
        disabled={enableBlocked}
        maxLength={48}
        placeholder="Créer un élément…"
        value={draftLabel}
        onChange={(event) => onDraftLabelChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onCreateCustom();
          }
        }}
      />
      <Button
        className="shrink-0 cursor-pointer"
        disabled={enableBlocked || draftLabel.trim().length < 1}
        size="sm"
        type="button"
        onClick={onCreateCustom}
      >
        <Plus className="size-4" aria-hidden />
        Ajouter
      </Button>
    </div>
  );
}

function JournalPrefsCreateFooter({
  draftLabel,
  isPro,
  enableBlocked,
  onDraftLabelChange,
  onCreateCustom,
}: {
  draftLabel: string;
  isPro: boolean;
  enableBlocked: boolean;
  onDraftLabelChange: (value: string) => void;
  onCreateCustom: () => void;
}) {
  if (!isPro) {
    return <JournalPrefsProUpsellFooter />;
  }

  return (
    <JournalPrefsCustomCreateForm
      draftLabel={draftLabel}
      enableBlocked={enableBlocked}
      onCreateCustom={onCreateCustom}
      onDraftLabelChange={onDraftLabelChange}
    />
  );
}

function JournalPrefsDrawerShell({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
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
              'bg-background flex h-[min(94dvh,44rem)] flex-col rounded-t-2xl',
              'transition-transform duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]',
              'starting:translate-y-full',
              'data-closed:translate-y-full data-closed:duration-150 data-closed:ease-out',
            )}
          >
            {children}
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

type JournalPrefsDrawerPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: JournalFilterId;
  onFilterChange: (id: JournalFilterId) => void;
  prefs: JournalPrefs;
  isPro: boolean;
  builtinRows: readonly JournalBuiltinTrackable[];
  customRows: readonly JournalCustomItem[];
  draftLabel: string;
  onDraftLabelChange: (value: string) => void;
  onCreateCustom: () => void;
  patch: PrefsPatcher;
};

function JournalPrefsDrawerInner({
  filter,
  onFilterChange,
  prefs,
  isPro,
  builtinRows,
  customRows,
  draftLabel,
  onDraftLabelChange,
  onCreateCustom,
  patch,
}: Omit<JournalPrefsDrawerPanelProps, 'open' | 'onOpenChange'>) {
  const showCreate = filter === 'all' || filter === 'personnalise';
  const enableBlocked = !canEnableAnotherTrackable(prefs, isPro);

  return (
    <>
      <JournalPrefsDrawerHeader />
      <JournalPrefsFilterTabs filter={filter} onFilterChange={onFilterChange} />
      <JournalPrefsTrackableList
        builtinRows={builtinRows}
        customRows={customRows}
        isPro={isPro}
        patch={patch}
        prefs={prefs}
      />
      {showCreate ? (
        <JournalPrefsCreateFooter
          draftLabel={draftLabel}
          enableBlocked={enableBlocked}
          isPro={isPro}
          onCreateCustom={onCreateCustom}
          onDraftLabelChange={onDraftLabelChange}
        />
      ) : null}
    </>
  );
}

export function JournalPrefsDrawerPanel({
  open,
  onOpenChange,
  ...innerProps
}: JournalPrefsDrawerPanelProps) {
  return (
    <JournalPrefsDrawerShell open={open} onOpenChange={onOpenChange}>
      <JournalPrefsDrawerInner {...innerProps} />
    </JournalPrefsDrawerShell>
  );
}
