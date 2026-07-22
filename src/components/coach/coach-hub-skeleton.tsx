import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronDownIcon, MessageSquarePlus, Send, Trash2 } from 'lucide-react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { Textarea } from '@/components/ui/textarea';

const EMPTY_HINT =
  'Pose une question à ton coach. Il connaît ta forme, ta récupération, tes seuils et tes objectifs.';

const SUGGESTION_LABELS = [
  "Comment se présente ma forme aujourd'hui ?",
  'Quelle séance me conseilles-tu pour demain ?',
  'Décale ma séance de seuil à après-demain',
  'Ajoute une sortie vélo endurance samedi',
] as const;

/** Mobile Select chrome — label value only skeletons. */
export function CoachMobileSelectLoadingRow() {
  return (
    <div className="flex items-center gap-1.5 p-2" aria-busy>
      <div className="min-w-0 flex-1">
        <div className="border-input flex h-8 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border bg-transparent py-2 pr-2 pl-2.5 text-sm">
          <SkeletonDataValue heightClassName="h-3.5" widthClassName="w-36 max-w-[70%]" />
          <ChevronDownIcon
            className="text-muted-foreground size-4 shrink-0 opacity-50"
            aria-hidden
          />
        </div>
      </div>
      <Button
        aria-label="Supprimer la conversation"
        className="text-muted-foreground shrink-0"
        size="icon-sm"
        type="button"
        variant="ghost"
        disabled
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

/** Desktop sidebar — only title/date values skeleton. */
export function CoachConversationListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="space-y-1 p-2" aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="rounded-lg px-2 py-2">
          <SkeletonDataValue heightClassName="h-4" widthClassName="w-[min(100%,9rem)]" />
          <div className="mt-1">
            <SkeletonDataValue heightClassName="h-3" widthClassName="w-16" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Real empty-chat chrome (no skeletons) — landing is always a new draft. */
export function CoachChatEmptyChrome({ header }: { header?: ReactNode }) {
  return (
    <div className="rounded-analysis-lg flex h-full min-w-0 flex-1 flex-col lg:border">
      <div className="flex-1 overflow-y-auto">
        {header ? (
          <div className="bg-background/85 supports-backdrop-filter:bg-background/70 sticky top-0 z-10 backdrop-blur-md">
            {header}
          </div>
        ) : null}
        <div className="space-y-4 p-4">
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-muted-foreground max-w-sm text-sm">{EMPTY_HINT}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTION_LABELS.map((label) => (
                <span
                  key={label}
                  className="border-border/60 text-muted-foreground rounded-full border px-3 py-1.5 text-xs opacity-50"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="border-border/60 flex items-center gap-2 border-t p-3">
        <Textarea
          className="max-h-40 min-h-10 resize-y"
          placeholder="Demande conseil à ton coach…"
          rows={1}
          value=""
          disabled
        />
        <Button size="icon" type="button" disabled>
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/** Fetching an existing thread — message values only. */
export function CoachChatPanelSkeleton({ header }: { header?: ReactNode }) {
  return (
    <div className="rounded-analysis-lg flex h-full min-w-0 flex-1 flex-col lg:border" aria-busy>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {header ? (
          <div className="bg-background/85 supports-backdrop-filter:bg-background/70 sticky top-0 z-10 backdrop-blur-md">
            {header}
          </div>
        ) : null}
        <div className="space-y-4 p-4">
          <div className="flex justify-end">
            <Skeleton className="rounded-analysis-lg h-10 w-[min(100%,14rem)]" />
          </div>
          <div className="flex justify-start">
            <div className="analysis-panel-alt rounded-analysis-lg w-full max-w-[90%] space-y-2 px-4 py-3">
              <Skeleton className="h-4 w-[92%] rounded-full" />
              <Skeleton className="h-4 w-[78%] rounded-full" />
              <Skeleton className="h-4 w-[64%] rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="border-border/60 flex items-center gap-2 border-t p-3">
        <Textarea
          className="max-h-40 min-h-10 resize-y"
          placeholder="Demande conseil à ton coach…"
          rows={1}
          value=""
          disabled
        />
        <Button size="icon" type="button" disabled>
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function CoachPageHeader({
  newDisabled = false,
  onNewConversation,
}: {
  newDisabled?: boolean;
  onNewConversation?: () => void;
}) {
  return (
    <StickyHeader className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-primary text-xs font-medium uppercase">Coach</p>
        <h1 className="text-page-title mt-1">Fil & conversations</h1>
        <p className="text-muted-foreground mt-1">
          Messages du jour et chat libre avec ton coach.{' '}
          <Link className="text-primary hover:underline" href="/settings/account">
            Mon profil
          </Link>
        </p>
      </div>
      <Button disabled={newDisabled || !onNewConversation} onClick={onNewConversation}>
        <MessageSquarePlus className="size-4" />
        Nouvelle conversation
      </Button>
    </StickyHeader>
  );
}

function CoachMobileLoadingHeader() {
  return (
    <div className="flex flex-col gap-2 px-3 pt-2 pb-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-page-title truncate">Fil & conversations</h1>
        <Button aria-label="Nouvelle conversation" size="icon" variant="outline" disabled>
          <MessageSquarePlus className="size-4" />
        </Button>
      </div>
      <div className="analysis-panel rounded-analysis-lg">
        <CoachMobileSelectLoadingRow />
      </div>
    </div>
  );
}

/** Route / Suspense / pre-mount — real chrome; only select/list values skeleton. */
export function CoachHubSkeleton() {
  return (
    <>
      <div
        className="bg-background safe-area-top fixed inset-x-0 top-0 z-30 flex flex-col lg:hidden"
        style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <CoachChatEmptyChrome header={<CoachMobileLoadingHeader />} />
      </div>

      <div className="hidden space-y-6 lg:block">
        <CoachPageHeader newDisabled />
        <div className="flex h-[calc(100dvh-190px)] flex-col gap-3 lg:flex-row lg:gap-4">
          <aside className="analysis-panel rounded-analysis-lg flex w-full shrink-0 flex-col lg:h-full lg:w-56">
            <CoachConversationListSkeleton />
          </aside>
          <CoachChatEmptyChrome />
        </div>
      </div>
    </>
  );
}
