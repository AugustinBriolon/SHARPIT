'use client';

import Link from 'next/link';
import { CalendarPlus, PencilLine, PlugZap, RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MorningWellnessDialog } from '@/components/today/dashboard/morning-wellness-dialog';
import { SnapshotStatusBanner } from '@/components/today/dashboard/today-dashboard-states';
import { Button } from '@/components/ui/button';
import { useWellnessCheckin } from '@/hooks/use-wellness-checkin';
import { cn } from '@/lib/utils';

/**
 * What the athlete sees when the Digital Twin has nothing to say yet.
 *
 * The previous version offered a single "Actualiser" link, which is the one
 * action that cannot help when the cause is that no data source is connected.
 * This screen names the likely causes and gives each one a way out.
 */

type EmptyStateAction = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

const ACTIONS: EmptyStateAction[] = [
  {
    href: '/settings/integrations',
    icon: PlugZap,
    title: 'Connecter une source',
    description: 'Garmin, Withings, Renpho — la montre alimente sommeil, VFC et charge.',
  },
  {
    href: '/training/planning',
    icon: CalendarPlus,
    title: 'Planifier une séance',
    description: 'Un objectif et quelques séances suffisent à lancer les projections.',
  },
  {
    href: '/training/manual',
    icon: PencilLine,
    title: 'Ajouter une activité',
    description: 'Saisis une sortie à la main si elle n’a pas été enregistrée.',
  },
];

function ActionRow({ action }: { action: EmptyStateAction }) {
  const Icon = action.icon;
  return (
    <li>
      <Link
        href={action.href}
        className={cn(
          'border-analysis-border/70 bg-background/50 hover:border-primary/40',
          'focus-visible:outline-ring flex min-h-11 items-start gap-3 rounded-lg border px-3 py-3',
          'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
        )}
      >
        <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
        <span className="min-w-0">
          <span className="text-foreground block text-sm font-medium">{action.title}</span>
          <span className="text-muted-foreground block text-xs leading-relaxed">
            {action.description}
          </span>
        </span>
      </Link>
    </li>
  );
}

export function TodayEmptyState({
  statusMessage,
  statusHref,
  statusSnoozeKey,
  isRefreshing,
  refreshDisabled,
  refreshLabel,
  onRefresh,
  onWellnessCompleted,
}: {
  statusMessage?: string | null;
  statusHref?: string | null;
  statusSnoozeKey?: string | null;
  isRefreshing: boolean;
  refreshDisabled: boolean;
  /** Reads "Actualiser", or the offline reason when refreshing is unavailable. */
  refreshLabel: string;
  onRefresh: () => void;
  onWellnessCompleted?: () => void;
}) {
  const { completed: wellnessDone } = useWellnessCheckin();

  return (
    <div className="mx-auto space-y-5">
      <header className="space-y-1.5">
        <h1 className="text-page-title">Rien à afficher aujourd’hui</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          SHARPIT n’a pas encore assez de signaux pour lire ta journée. Il lui faut au moins une
          source connectée, ou une saisie de ta part.
        </p>
      </header>

      {statusMessage ? (
        <SnapshotStatusBanner
          href={statusHref}
          isRefreshing={isRefreshing}
          message={statusMessage}
          snoozeKey={statusSnoozeKey}
        />
      ) : null}

      <section className="space-y-3">
        <h2 className="text-label">Par où commencer</h2>
        <ul className="space-y-2">
          {ACTIONS.map((action) => (
            <ActionRow key={action.href} action={action} />
          ))}
        </ul>
      </section>

      {/*
        The dialog hides itself once the check-in is done, so the section has to
        make the same call — otherwise the athlete reads an offer with no control
        under it. When it is already done, say so instead of staying silent.
      */}
      <section className="space-y-2">
        <h2 className="text-label">Sans attendre la montre</h2>
        {wellnessDone ? (
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

      <div className="border-analysis-border/60 flex justify-center border-t pt-4">
        <Button
          disabled={refreshDisabled}
          size="sm"
          type="button"
          variant="outline"
          onClick={onRefresh}
        >
          <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} aria-hidden />
          {refreshLabel}
        </Button>
      </div>
    </div>
  );
}
