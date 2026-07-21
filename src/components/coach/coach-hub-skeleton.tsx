import type { ReactNode } from 'react';
import Link from 'next/link';
import { MessageSquarePlus } from 'lucide-react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';

/** Conversation rows — panel chrome stays. */
export function CoachConversationListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="space-y-1 p-2" aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="rounded-lg px-2 py-2">
          <SkeletonDataValue heightClassName="h-4" widthClassName="w-[min(100%,9rem)]" />
          <div className="mt-1.5">
            <SkeletonDataValue heightClassName="h-3" widthClassName="w-16" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function CoachComposerChrome() {
  return (
    <div className="border-border/60 flex items-center gap-2 border-t p-3">
      <Skeleton className="h-10 min-h-10 flex-1 rounded-md" />
      <Skeleton className="size-9 shrink-0 rounded-md" />
    </div>
  );
}

/**
 * Chat panel skeleton.
 * `empty` = landing “Nouvelle conversation” (suggestions).
 * `thread` = fetching an existing conversation (bubbles).
 */
export function CoachChatPanelSkeleton({
  header,
  variant = 'empty',
}: {
  header?: ReactNode;
  variant?: 'empty' | 'thread';
}) {
  return (
    <div className="rounded-analysis-lg flex h-full min-w-0 flex-1 flex-col lg:border" aria-busy>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {header ? (
          <div className="bg-background/85 supports-backdrop-filter:bg-background/70 sticky top-0 z-10 backdrop-blur-md">
            {header}
          </div>
        ) : null}
        {variant === 'empty' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
            <Skeleton className="h-4 w-full max-w-sm rounded-full" />
            <div className="flex flex-wrap justify-center gap-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-28 rounded-full sm:w-36" />
              ))}
            </div>
          </div>
        ) : (
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
        )}
      </div>
      <CoachComposerChrome />
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
          <Link className="text-primary hover:underline" href="/profil">
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
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

/** Route / Suspense / pre-mount — mobile fixed shell XOR desktop sticky hub. */
export function CoachHubSkeleton() {
  return (
    <>
      <div
        className="bg-background safe-area-top fixed inset-x-0 top-0 z-30 flex flex-col lg:hidden"
        style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <CoachChatPanelSkeleton header={<CoachMobileLoadingHeader />} variant="empty" />
      </div>

      <div className="hidden space-y-6 lg:block">
        <CoachPageHeader newDisabled />
        <div className="flex h-[calc(100dvh-190px)] flex-col gap-3 lg:flex-row lg:gap-4">
          <aside className="analysis-panel rounded-analysis-lg flex w-full shrink-0 flex-col lg:h-full lg:w-56">
            <CoachConversationListSkeleton />
          </aside>
          <CoachChatPanelSkeleton variant="empty" />
        </div>
      </div>
    </>
  );
}
