'use client';

import Link from 'next/link';
import { CalendarPlus, PencilLine, PlugZap, RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MorningWellnessDialog } from '@/components/today/dashboard/morning-wellness-dialog';
import { SnapshotStatusBanner } from '@/components/today/dashboard/today-dashboard-states';
import { Button } from '@/components/ui/button';
import { useWellnessCheckin } from '@/hooks/use-wellness-checkin';
import { cn } from '@sharpit/server/lib/utils';

/**
 * What the athlete sees when the Digital Twin has nothing to say yet.
 *
 * One action carries the screen (DESIGN_LANGUAGE §13.2). The previous version
 * offered three peer links plus a check-in plus a refresh — five targets on the
 * screen whose whole subject is that the athlete has nothing, which is the one
 * moment decision cost must be lowest.
 *
 * Connecting a source is the primary because it is the likely cause and the only
 * one that keeps paying afterwards. The other two stay reachable as quiet text:
 * they answer different causes (no plan, unrecorded outing), so removing them
 * would strand those athletes rather than simplify their screen.
 */

type AlternativeAction = {
  href: string;
  icon: LucideIcon;
  title: string;
};

const PRIMARY_DESCRIPTION = 'Garmin, Withings, Renpho — la montre alimente sommeil, VFC et charge.';

const ALTERNATIVES: AlternativeAction[] = [
  { href: '/plan/semaine', icon: CalendarPlus, title: 'Planifier une séance' },
  { href: '/activite/nouvelle', icon: PencilLine, title: 'Ajouter une activité' },
];

function EmptyStateHeader() {
  return (
    <header className="space-y-1.5">
      <h1 className="text-page-title">Rien à afficher</h1>
      <p className="text-muted-foreground text-sm leading-relaxed">
        SHARPIT n’a pas encore assez de signaux pour lire ta journée. Il lui faut au moins une
        source connectée, ou une saisie de ta part.
      </p>
    </header>
  );
}

function AlternativeLink({ action }: { action: AlternativeAction }) {
  const Icon = action.icon;
  return (
    <Link
      href={action.href}
      className={cn(
        'text-muted-foreground hover:text-foreground focus-visible:outline-ring',
        'inline-flex min-h-11 items-center gap-2 text-xs transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 lg:min-h-0',
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {action.title}
    </Link>
  );
}

function PrimaryAction() {
  return (
    <div className="space-y-2">
      <Link
        href="/settings/integrations"
        className={cn(
          'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-ring',
          'flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium',
          'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
          'active:scale-[var(--press-scale-large)]',
        )}
      >
        <PlugZap className="size-4 shrink-0" aria-hidden />
        Connecter une source
      </Link>
      <p className="text-muted-foreground text-xs leading-relaxed">{PRIMARY_DESCRIPTION}</p>
    </div>
  );
}

/**
 * The dialog hides itself once the check-in is done, so this section has to make
 * the same call — otherwise the athlete reads an offer with no control under it.
 * When it is already done, say so instead of staying silent.
 */
function WithoutTheWatch({ onWellnessCompleted }: { onWellnessCompleted?: () => void }) {
  const { completed } = useWellnessCheckin();

  return (
    <section className="border-analysis-border/60 space-y-2 border-t pt-4">
      <h2 className="text-label">Sans attendre la montre</h2>
      {completed ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          Ressenti du matin déjà saisi. Il sera pris en compte à la prochaine actualisation.
        </p>
      ) : (
        <>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Ton ressenti du matin suffit à produire une première lecture.
          </p>
          <MorningWellnessDialog onCompleted={onWellnessCompleted} />
        </>
      )}
    </section>
  );
}

function RefreshRow({
  isRefreshing,
  refreshDisabled,
  refreshLabel,
  onRefresh,
}: {
  isRefreshing: boolean;
  refreshDisabled: boolean;
  refreshLabel: string;
  onRefresh: () => void;
}) {
  return (
    <div className="flex justify-center">
      <Button
        disabled={refreshDisabled}
        size="sm"
        type="button"
        variant="ghost"
        onClick={onRefresh}
      >
        <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} aria-hidden />
        {refreshLabel}
      </Button>
    </div>
  );
}

type TodayEmptyStateProps = {
  statusMessage?: string | null;
  statusHref?: string | null;
  statusSnoozeKey?: string | null;
  isRefreshing: boolean;
  refreshDisabled: boolean;
  /** Reads "Actualiser", or the offline reason when refreshing is unavailable. */
  refreshLabel: string;
  onRefresh: () => void;
  onWellnessCompleted?: () => void;
};

export function TodayEmptyState(props: TodayEmptyStateProps) {
  return (
    <div className="mx-auto space-y-5">
      <EmptyStateHeader />

      {props.statusMessage ? (
        <SnapshotStatusBanner
          href={props.statusHref}
          isRefreshing={props.isRefreshing}
          message={props.statusMessage}
          snoozeKey={props.statusSnoozeKey}
        />
      ) : null}

      <PrimaryAction />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        {ALTERNATIVES.map((action) => (
          <AlternativeLink key={action.href} action={action} />
        ))}
      </div>

      <WithoutTheWatch onWellnessCompleted={props.onWellnessCompleted} />

      <RefreshRow
        isRefreshing={props.isRefreshing}
        refreshDisabled={props.refreshDisabled}
        refreshLabel={props.refreshLabel}
        onRefresh={props.onRefresh}
      />
    </div>
  );
}
