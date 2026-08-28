import type { useWeeklyCoachingBriefViewModel } from '@/hooks/use-data';
import { formatTrainingLoad } from '@/lib/preferences/display-mode';
import type { DisplayMode } from '@/lib/preferences/display-mode';
import { Section } from './weekly-brief-section';

type WeeklyBriefVm = NonNullable<ReturnType<typeof useWeeklyCoachingBriefViewModel>['data']>;

function WeeklyBriefPlanSection({ vm, mode }: { vm: WeeklyBriefVm; mode: DisplayMode }) {
  if (!vm.planContext) {
    return null;
  }
  return (
    <Section title="Phase et charge cible">
      <p>
        {vm.planContext.phaseLabel} · cible{' '}
        <span className="font-mono">{formatTrainingLoad(vm.planContext.targetLoad, mode)}</span>
        {vm.planContext.isDeload ? ' (semaine de récupération)' : ''}
      </p>
      {vm.planContext.focus ? (
        <p className="text-muted-foreground text-xs">{vm.planContext.focus}</p>
      ) : null}
    </Section>
  );
}

function WeeklyBriefGoalSection({ vm }: { vm: WeeklyBriefVm }) {
  if (!vm.goalContext) {
    return null;
  }
  return (
    <Section title="Objectif">
      <p>{vm.goalContext.title}</p>
      <p className="text-muted-foreground text-xs">
        {[
          vm.goalContext.horizonLabel,
          vm.goalContext.targetDateLabel,
          vm.goalContext.daysToGo !== null ? `J-${vm.goalContext.daysToGo}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
    </Section>
  );
}

function WeeklyBriefLoadSection({ vm, mode }: { vm: WeeklyBriefVm; mode: DisplayMode }) {
  if (!vm.load) {
    return null;
  }
  return (
    <Section title="Charge planifiée vs. tolérée">
      <p>
        {formatTrainingLoad(vm.load.plannedLoad, mode)} planifiés
        {vm.load.toleratedCeiling !== null
          ? ` sur ~${formatTrainingLoad(vm.load.toleratedCeiling, mode)} tolérés`
          : ''}
      </p>
    </Section>
  );
}

function WeeklyBriefKeySessionsSection({ vm }: { vm: WeeklyBriefVm }) {
  if (vm.keySessions.length === 0) {
    return null;
  }
  return (
    <Section title="Séances clés">
      <ul className="space-y-2">
        {vm.keySessions.map((s) => (
          <li key={s.sessionId} className="border-border/50 rounded-md border p-2">
            <p className="text-xs font-medium">
              {s.dateLabel} · {s.typeLabel}
              {s.intensityLabel ? ` · ${s.intensityLabel}` : ''}
            </p>
            {s.goalTitle ? (
              <p className="text-muted-foreground mt-0.5 text-xs">Sert {s.goalTitle}</p>
            ) : null}
            {s.purpose ? <p className="text-muted-foreground mt-0.5 text-xs">{s.purpose}</p> : null}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function WeeklyBriefRecoverySection({ vm }: { vm: WeeklyBriefVm }) {
  if (!vm.recovery) {
    return null;
  }
  return (
    <Section title="Récupération">
      <p className="text-muted-foreground text-xs">{vm.recovery.note}</p>
    </Section>
  );
}

function WeeklyBriefLimitingFactorSection({ vm }: { vm: WeeklyBriefVm }) {
  if (!vm.limitingFactor?.limitingFactorLabel) {
    return null;
  }
  return (
    <Section title="Facteur limitant actuel">
      <p>
        {vm.limitingFactor.limitingFactorLabel}
        {vm.limitingFactor.confidenceTierLabel ? ` · ${vm.limitingFactor.confidenceTierLabel}` : ''}
      </p>
      <p className="text-muted-foreground text-xs">{vm.limitingFactor.asOfLabel}</p>
    </Section>
  );
}

function WeeklyBriefAssumptionsSection({ vm }: { vm: WeeklyBriefVm }) {
  if (vm.assumptions.length === 0 && vm.dataGaps.length === 0) {
    return null;
  }
  return (
    <Section title="Hypothèses et données manquantes">
      <ul className="text-muted-foreground space-y-1 text-xs">
        {[...vm.assumptions, ...vm.dataGaps].map((line) => (
          <li key={line}>• {line}</li>
        ))}
      </ul>
    </Section>
  );
}

function WeeklyBriefChangeTriggersSection({ vm }: { vm: WeeklyBriefVm }) {
  if (vm.whatWouldChange.length === 0) {
    return null;
  }
  return (
    <Section title="Ce qui ferait changer cette semaine">
      <ul className="text-muted-foreground space-y-1 text-xs">
        {vm.whatWouldChange.map((line) => (
          <li key={line}>• {line}</li>
        ))}
      </ul>
    </Section>
  );
}

function WeeklyBriefLearningSection({ vm }: { vm: WeeklyBriefVm }) {
  if (vm.learningFeedback.length === 0) {
    return null;
  }
  return (
    <Section title="Ce que l'historique montre">
      <ul className="space-y-1 text-xs">
        {vm.learningFeedback.map((item) => (
          <li key={item.key}>{item.sentence}</li>
        ))}
      </ul>
    </Section>
  );
}

export function WeeklyBriefContent({ vm, mode }: { vm: WeeklyBriefVm; mode: DisplayMode }) {
  return (
    <div className="space-y-4">
      <WeeklyBriefPlanSection mode={mode} vm={vm} />
      <WeeklyBriefGoalSection vm={vm} />
      <WeeklyBriefLoadSection mode={mode} vm={vm} />
      <WeeklyBriefKeySessionsSection vm={vm} />
      <WeeklyBriefRecoverySection vm={vm} />
      <WeeklyBriefLimitingFactorSection vm={vm} />
      <WeeklyBriefAssumptionsSection vm={vm} />
      <WeeklyBriefChangeTriggersSection vm={vm} />
      <WeeklyBriefLearningSection vm={vm} />
    </div>
  );
}
