'use client';

import Link from 'next/link';
import { format, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PlanPhase } from '@prisma/client';
import { Archive, CalendarRange, Loader2, Target } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTrainingPlan, useTrainingPlanMutations } from '@/hooks/use-data';
import { guardedActionLabel, useOfflineGuard } from '@/hooks/use-offline-guard';
import { MOI_OBJECTIFS_PATH } from '@/lib/moi/paths';
import { buildMacroPhaseRail } from '@/lib/plan/trajectory/plan-macro-rail';
import type { ClientGoal, ClientPlanWeek, ClientTrainingPlan } from '@/lib/query/types';
import { phaseLabels } from '@/lib/training/periodization';
import { cn } from '@/lib/utils';

const NO_GOAL = 'none';
const WEEK_OPTS = { weekStartsOn: 1 as const };

const PHASE_RAIL_SHORT: Record<PlanPhase, string> = {
  BASE: 'Base',
  BUILD: 'Dév.',
  PEAK: 'Spéc.',
  TAPER: 'Affût.',
  RACE: 'Course',
};

function mondayKey(value: Date | string): string {
  return format(startOfWeek(new Date(value), WEEK_OPTS), 'yyyy-MM-dd');
}

function datedUpcomingGoals(goals: ClientGoal[]): ClientGoal[] {
  const now = new Date();
  return goals
    .filter((goal) => !goal.achieved && goal.targetDate)
    .filter((goal) => new Date(goal.targetDate as unknown as string) >= now);
}

function initialGoalId(goals: ClientGoal[]): string {
  const dated = datedUpcomingGoals(goals);
  return dated.length === 1 ? dated[0].id : NO_GOAL;
}

function groupWeeksByPhase(weeks: readonly ClientPlanWeek[]) {
  const groups: { phase: PlanPhase; weeks: ClientPlanWeek[] }[] = [];
  for (const week of weeks) {
    const last = groups.at(-1);
    if (last && last.phase === week.phase) {
      last.weeks.push(week);
    } else {
      groups.push({ phase: week.phase, weeks: [week] });
    }
  }
  return groups;
}

function goalOptionLabel(goal: ClientGoal): string {
  if (!goal.targetDate) {
    return goal.title;
  }
  return `${goal.title} - ${format(new Date(goal.targetDate as unknown as string), 'd MMM yyyy', { locale: fr })}`;
}

function MacroPlanSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-4">
      <div className="bg-muted/60 h-16 animate-pulse rounded-lg" />
      <div className="space-y-2">
        <div className="bg-muted/50 h-10 animate-pulse rounded-md" />
        <div className="bg-muted/40 h-10 animate-pulse rounded-md" />
        <div className="bg-muted/30 h-10 animate-pulse rounded-md" />
      </div>
      <p className="text-muted-foreground text-xs">Chargement du plan…</p>
    </div>
  );
}

function MacroPhaseRail({ plan }: { plan: ClientTrainingPlan }) {
  const rail = useMemo(() => buildMacroPhaseRail(plan, new Date()), [plan]);
  if (!rail) {
    return null;
  }

  return (
    <ol
      className="grid gap-x-1.5 gap-y-2"
      style={{ gridTemplateColumns: `repeat(${rail.runs.length}, minmax(0, 1fr))` }}
    >
      {rail.runs.map((run, index) => (
        <li
          key={`${run.phase}-${index}`}
          aria-current={run.current ? 'step' : undefined}
          aria-label={run.label}
          title={run.label}
          className={cn(
            'min-w-0 overflow-hidden border-t-2 pt-1.5 text-[10px] leading-tight',
            run.current
              ? 'border-highlight dark:border-foreground text-foreground font-semibold'
              : 'border-border text-muted-foreground',
          )}
        >
          <span className="block truncate sm:hidden">{PHASE_RAIL_SHORT[run.phase]}</span>
          <span className="hidden truncate sm:block">{run.label}</span>
        </li>
      ))}
    </ol>
  );
}

function MacroPhaseOverview({ plan }: { plan: ClientTrainingPlan }) {
  const [first] = plan.weeks;
  const last = plan.weeks.at(-1);
  const range =
    first && last
      ? `${format(new Date(first.weekStart), 'd MMM', { locale: fr })} - ${format(new Date(last.weekStart), 'd MMM yyyy', { locale: fr })}`
      : null;

  return (
    <div className="analysis-panel rounded-analysis-lg min-w-0 space-y-3 overflow-x-hidden p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-foreground text-sm font-medium">
          {plan.weeks.length} semaine{plan.weeks.length > 1 ? 's' : ''}
        </p>
        {range ? (
          <p className="text-muted-foreground font-mono text-xs tabular-nums">{range}</p>
        ) : null}
      </div>
      <MacroPhaseRail plan={plan} />
      {plan.summary ? (
        <p className="text-muted-foreground text-xs leading-relaxed text-pretty sm:text-[13px]">
          {plan.summary}
        </p>
      ) : null}
    </div>
  );
}

function MacroWeekRow({ week, isCurrent }: { week: ClientPlanWeek; isCurrent: boolean }) {
  return (
    <li
      className={cn(
        'flex min-w-0 items-start justify-between gap-3 px-1 py-2.5',
        // Flush to divide-y — no radius / negative margin (leaves a white wedge at the hairline).
        isCurrent && 'bg-analysis-surface-alt/80 -mx-1 px-2',
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5 overflow-hidden">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-sm font-medium">
            {format(new Date(week.weekStart), 'd MMM yyyy', { locale: fr })}
          </p>
          {isCurrent ? (
            <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Cette semaine
            </span>
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs text-pretty break-words">
          {week.isDeload ? 'Récupération' : week.focus}
        </p>
      </div>
      <span className="text-foreground shrink-0 font-mono text-xs font-medium tabular-nums">
        {week.targetLoad}
        <span className="text-muted-foreground font-sans font-normal"> TSS</span>
      </span>
    </li>
  );
}

function MacroWeekList({ weeks }: { weeks: ClientTrainingPlan['weeks'] }) {
  const groups = useMemo(() => groupWeeksByPhase(weeks), [weeks]);
  const currentKey = mondayKey(new Date());

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      {groups.map((group) => (
        <section key={`${group.phase}-${group.weeks[0]?.id}`} className="min-w-0 overflow-x-hidden">
          <h3 className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wide uppercase">
            {phaseLabels[group.phase]}
            <span className="text-muted-foreground/70 font-mono font-normal tracking-normal normal-case">
              {' '}
              · {group.weeks.length} sem.
            </span>
          </h3>
          <ul className="divide-analysis-border/50 divide-y overflow-x-hidden">
            {group.weeks.map((week) => (
              <MacroWeekRow
                key={week.id}
                isCurrent={mondayKey(week.weekStart) === currentKey}
                week={week}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MacroPlanScroll({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4">
      {children}
    </div>
  );
}

function MacroPlanNoGoalEmpty() {
  return (
    <InkEmptyState
      description="Ajoute une course datée pour calculer les phases et la charge jusqu'à l'objectif."
      icon={Target}
      title="Aucun objectif daté"
      action={
        <Button
          nativeButton={false}
          render={<Link href={MOI_OBJECTIFS_PATH} />}
          size="sm"
          variant="outline"
        >
          Ouvrir Objectifs
        </Button>
      }
      compact
    />
  );
}

function MacroPlanGoalSelect({
  datedGoals,
  goalId,
  onGoalChange,
}: {
  datedGoals: ClientGoal[];
  goalId: string;
  onGoalChange: (value: string) => void;
}) {
  const selectedGoal = datedGoals.find((goal) => goal.id === goalId);
  const selectLabel =
    goalId === NO_GOAL ? 'Choisir un objectif…' : (selectedGoal?.title ?? 'Choisir');

  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor="macro-plan-goal">Objectif</Label>
      <Select value={goalId} onValueChange={(value) => onGoalChange(value ?? NO_GOAL)}>
        <SelectTrigger className="w-full min-w-0" id="macro-plan-goal">
          <SelectValue>{selectLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {datedGoals.map((goal) => (
            <SelectItem key={goal.id} value={goal.id}>
              <span className="block truncate">{goalOptionLabel(goal)}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground text-xs text-pretty">
        Une course datée sert de jalon. Le plan pose les blocs de charge, pas les séances.
      </p>
    </div>
  );
}

function MacroPlanActions({ children }: { children: ReactNode }) {
  return (
    <div className="border-border/60 bg-muted/40 flex shrink-0 flex-col-reverse gap-2 border-t px-4 py-3 sm:flex-row sm:justify-end">
      {children}
    </div>
  );
}

function MacroPlanCreateFooter({
  datedGoalsEmpty,
  goalId,
  isGenerating,
  offline,
  offlineLabel,
  guardDisabled,
  onClose,
  onGenerate,
}: {
  datedGoalsEmpty: boolean;
  goalId: string;
  isGenerating: boolean;
  offline: boolean;
  offlineLabel: string;
  guardDisabled: boolean;
  onClose: () => void;
  onGenerate: () => void;
}) {
  const generateLabel = guardedActionLabel(offline, offlineLabel, 'Générer', {
    active: isGenerating,
    label: 'Génération…',
  });

  return (
    <MacroPlanActions>
      <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={onClose}>
        Fermer
      </Button>
      {datedGoalsEmpty ? null : (
        <Button
          className="w-full sm:w-auto"
          disabled={guardDisabled || isGenerating || goalId === NO_GOAL}
          type="button"
          onClick={onGenerate}
        >
          {isGenerating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {generateLabel}
        </Button>
      )}
    </MacroPlanActions>
  );
}

function MacroPlanCreateForm({
  datedGoals,
  error,
  goalId,
  onGoalChange,
}: {
  datedGoals: ClientGoal[];
  error: string | null;
  goalId: string;
  onGoalChange: (value: string) => void;
}) {
  if (datedGoals.length === 0) {
    return <MacroPlanNoGoalEmpty />;
  }

  return (
    <>
      <MacroPlanGoalSelect datedGoals={datedGoals} goalId={goalId} onGoalChange={onGoalChange} />
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}. Réessaie ou choisis un autre objectif.
        </p>
      ) : null}
    </>
  );
}

function ActivePlanFooter({
  isArchiving,
  offline,
  offlineLabel,
  guardDisabled,
  onArchive,
  onClose,
}: {
  isArchiving: boolean;
  offline: boolean;
  offlineLabel: string;
  guardDisabled: boolean;
  onArchive: () => void;
  onClose: () => void;
}) {
  const archiveLabel = guardedActionLabel(offline, offlineLabel, 'Archiver', {
    active: isArchiving,
    label: 'Archivage…',
  });

  return (
    <MacroPlanActions>
      <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={onClose}>
        Fermer
      </Button>
      <Button
        className="w-full sm:w-auto"
        disabled={guardDisabled || isArchiving}
        type="button"
        variant="destructive"
        onClick={onArchive}
      >
        {isArchiving ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Archive className="size-4" aria-hidden />
        )}
        {archiveLabel}
      </Button>
    </MacroPlanActions>
  );
}

function ActivePlanView({ plan, error }: { plan: ClientTrainingPlan; error: string | null }) {
  return (
    <>
      <MacroPhaseOverview plan={plan} />
      <MacroWeekList weeks={plan.weeks} />
      <p className="text-muted-foreground text-xs text-pretty">
        Ensuite : Remplir pour poser les séances, Ajuster pour réarranger la semaine.
      </p>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}. Réessaie dans un instant.
        </p>
      ) : null}
    </>
  );
}

type MacroPlanBodyProps = {
  activePlan: ClientTrainingPlan | null;
  datedGoals: ClientGoal[];
  error: string | null;
  goalId: string;
  guardDisabled: boolean;
  isArchiving: boolean;
  isGenerating: boolean;
  isLoadingPlan: boolean;
  offline: boolean;
  offlineLabel: string;
  onArchive: () => void;
  onClose: () => void;
  onGenerate: () => void;
  onGoalChange: (value: string) => void;
};

function MacroPlanLoadingBody() {
  return (
    <MacroPlanScroll>
      <MacroPlanSkeleton />
    </MacroPlanScroll>
  );
}

function MacroPlanActiveBody({
  activePlan,
  error,
  guardDisabled,
  isArchiving,
  offline,
  offlineLabel,
  onArchive,
  onClose,
}: Pick<
  MacroPlanBodyProps,
  | 'activePlan'
  | 'error'
  | 'guardDisabled'
  | 'isArchiving'
  | 'offline'
  | 'offlineLabel'
  | 'onArchive'
  | 'onClose'
> & { activePlan: ClientTrainingPlan }) {
  return (
    <>
      <MacroPlanScroll>
        <ActivePlanView error={error} plan={activePlan} />
      </MacroPlanScroll>
      <ActivePlanFooter
        guardDisabled={guardDisabled}
        isArchiving={isArchiving}
        offline={offline}
        offlineLabel={offlineLabel}
        onArchive={onArchive}
        onClose={onClose}
      />
    </>
  );
}

function MacroPlanCreateBody({
  datedGoals,
  error,
  goalId,
  guardDisabled,
  isGenerating,
  offline,
  offlineLabel,
  onClose,
  onGenerate,
  onGoalChange,
}: Pick<
  MacroPlanBodyProps,
  | 'datedGoals'
  | 'error'
  | 'goalId'
  | 'guardDisabled'
  | 'isGenerating'
  | 'offline'
  | 'offlineLabel'
  | 'onClose'
  | 'onGenerate'
  | 'onGoalChange'
>) {
  return (
    <>
      <MacroPlanScroll>
        <MacroPlanCreateForm
          datedGoals={datedGoals}
          error={error}
          goalId={goalId}
          onGoalChange={onGoalChange}
        />
      </MacroPlanScroll>
      <MacroPlanCreateFooter
        datedGoalsEmpty={datedGoals.length === 0}
        goalId={goalId}
        guardDisabled={guardDisabled}
        isGenerating={isGenerating}
        offline={offline}
        offlineLabel={offlineLabel}
        onClose={onClose}
        onGenerate={onGenerate}
      />
    </>
  );
}

function MacroPlanBody(props: MacroPlanBodyProps) {
  if (props.isLoadingPlan) {
    return <MacroPlanLoadingBody />;
  }
  if (props.activePlan) {
    return <MacroPlanActiveBody {...props} activePlan={props.activePlan} />;
  }
  return <MacroPlanCreateBody {...props} />;
}

interface MacroPlanDialogProps {
  goals: ClientGoal[];
  onClose: () => void;
}

function MacroPlanDialogHeader() {
  return (
    <DialogHeader className="shrink-0 space-y-1 border-b px-4 py-4 pr-12 text-left">
      <DialogTitle className="flex min-w-0 items-center gap-2 text-pretty">
        <CalendarRange className="text-primary size-4 shrink-0" aria-hidden />
        Plan macro
      </DialogTitle>
      <DialogDescription className="text-pretty">
        Phases et charge jusqu&apos;à la course. Les séances viennent après, via Remplir.
      </DialogDescription>
    </DialogHeader>
  );
}

function useMacroPlanGenerate({
  generate,
  goalId,
  guardDisabled,
  setError,
}: {
  generate: ReturnType<typeof useTrainingPlanMutations>['generate'];
  goalId: string;
  guardDisabled: boolean;
  setError: (error: string | null) => void;
}) {
  return function handleGenerate() {
    if (goalId === NO_GOAL || guardDisabled) {
      return;
    }
    setError(null);
    // BACKGROUND: result is the plan — keep panel open with pending label.
    generate.mutate(goalId, {
      onError: (err) => {
        setError(err instanceof Error ? err.message : 'La génération a échoué');
      },
    });
  };
}

function useMacroPlanArchive({
  activePlan,
  archive,
  confirm,
  guardDisabled,
  onClose,
  setError,
}: {
  activePlan: ClientTrainingPlan | null;
  archive: ReturnType<typeof useTrainingPlanMutations>['archive'];
  confirm: ReturnType<typeof useConfirmDialog>['confirm'];
  guardDisabled: boolean;
  onClose: () => void;
  setError: (error: string | null) => void;
}) {
  return async function handleArchive() {
    if (!activePlan || guardDisabled) {
      return;
    }
    const confirmed = await confirm({
      title: 'Archiver ce plan macro ?',
      description:
        'Les phases et charges cibles disparaissent de Plan. Les séances déjà posées restent.',
      confirmLabel: 'Archiver',
      cancelLabel: 'Annuler',
      variant: 'destructive',
    });
    if (!confirmed) {
      return;
    }
    setError(null);
    // Instant UX: close + optimistic clear in hook.
    onClose();
    archive.mutate(activePlan.id, {
      onError: (err) => {
        setError(err instanceof Error ? err.message : "L'archivage a échoué");
      },
    });
  };
}

export function MacroPlanDialog({ goals, onClose }: MacroPlanDialogProps) {
  const planQuery = useTrainingPlan();
  const { generate, archive } = useTrainingPlanMutations();
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [goalId, setGoalId] = useState(() => initialGoalId(goals));
  const [error, setError] = useState<string | null>(null);

  const datedGoals = useMemo(() => datedUpcomingGoals(goals), [goals]);
  const activePlan = (planQuery.data as ClientTrainingPlan | null | undefined) ?? null;
  const isLoadingPlan = planQuery.isPending && activePlan === null;

  const handleGenerate = useMacroPlanGenerate({ generate, goalId, guardDisabled, setError });
  const handleArchive = useMacroPlanArchive({
    activePlan,
    archive,
    confirm,
    guardDisabled,
    onClose,
    setError,
  });

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="flex max-h-[min(92dvh,40rem)] min-w-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <MacroPlanDialogHeader />
          <MacroPlanBody
            activePlan={activePlan}
            datedGoals={datedGoals}
            error={error}
            goalId={goalId}
            guardDisabled={guardDisabled}
            isArchiving={archive.isPending}
            isGenerating={generate.isPending}
            isLoadingPlan={isLoadingPlan}
            offline={offline}
            offlineLabel={offlineLabel}
            onArchive={handleArchive}
            onClose={onClose}
            onGenerate={handleGenerate}
            onGoalChange={setGoalId}
          />
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </>
  );
}
