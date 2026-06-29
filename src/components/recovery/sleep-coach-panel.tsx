import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  analyzeSleep,
  formatClock,
  formatDuration,
  type SleepCoachView,
  type SleepEntryInput,
  type SleepInsight,
  type SleepPhase,
} from "@/lib/sleep";

const TONE_TEXT: Record<string, string> = {
  good: "text-emerald-600",
  moderate: "text-amber-600",
  low: "text-red-600",
  neutral: "text-muted-foreground",
};

const TONE_DOT: Record<string, string> = {
  good: "bg-emerald-400",
  moderate: "bg-amber-400",
  low: "bg-red-400",
  neutral: "bg-muted-foreground",
};

export function SleepCoachPanel({ entries }: { entries: SleepEntryInput[] }) {
  const view = analyzeSleep(entries);

  if (!view.hasData) {
    return (
      <section className="space-y-4">
        <SleepHeader />
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Pas encore de données de sommeil. Connecte et synchronise Garmin
          depuis les Réglages.
        </div>
      </section>
    );
  }

  if (!view.hasDetailedData) {
    return (
      <section className="space-y-4">
        <SleepHeader />
        <SyncBanner />
        <AveragesRow view={view} durationOnly />
        {view.insights.length > 0 && (
          <InsightsList insights={view.insights} />
        )}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <SleepHeader />
      <div className="grid gap-4 lg:grid-cols-3">
        <BedtimeCard view={view} />
        <LastNightCard view={view} />
      </div>
      <AveragesRow view={view} />
      <InsightsList insights={view.insights} />
    </section>
  );
}

function SyncBanner() {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">Données limitées.</span>{" "}
      Seule la durée est disponible pour l&apos;instant. Va dans{" "}
      <span className="font-medium text-foreground">Réglages → Garmin</span>{" "}
      et lance{" "}
      <span className="font-medium text-foreground">
        Synchroniser la santé (60j)
      </span>{" "}
      pour récupérer les phases, le score et l&apos;heure de coucher conseillée.
    </div>
  );
}

function SleepHeader() {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="font-heading text-lg font-medium">Coach sommeil</h2>
      <p className="text-xs text-muted-foreground">
        Phases &amp; régularité — analyse Garmin
      </p>
    </div>
  );
}

function BedtimeCard({ view }: { view: SleepCoachView }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Heure de coucher conseillée
        </p>
        <p className="mt-3 font-mono text-4xl font-semibold tabular-nums text-primary">
          {view.recommendedBedtimeMin != null
            ? formatClock(view.recommendedBedtimeMin)
            : "—"}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {view.recommendedBedtimeMin != null
            ? `Pour viser ${formatDuration(view.targetDurationMin)} de sommeil avant ton réveil habituel.`
            : "Heure de réveil habituelle indisponible — quelques nuits supplémentaires sont nécessaires."}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span>
          Régularité :{" "}
          <span className="font-medium text-foreground">
            {view.regularityMin != null ? `±${view.regularityMin} min` : "—"}
          </span>
        </span>
      </div>
    </div>
  );
}

function LastNightCard({ view }: { view: SleepCoachView }) {
  const latest = view.latest;
  if (!latest) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Dernière nuit
          </p>
          <p className="mt-1 text-sm text-foreground/80">
            {format(latest.date, "EEEE d MMM", { locale: fr })} ·{" "}
            {formatClock(latest.bedtimeMin)} → {formatClock(latest.wakeMin)}
          </p>
        </div>
        <div className="text-right">
          <p
            className={cn(
              "font-mono text-3xl font-semibold tabular-nums",
              TONE_TEXT[latest.scoreTone],
            )}
          >
            {latest.score ?? "—"}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            score · {formatDuration(latest.durationMin)}
          </p>
        </div>
      </div>

      {latest.phases.length > 0 ? (
        <div className="mt-5 space-y-3">
          <PhaseBar phases={latest.phases} />
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            {latest.phases.map((p) => (
              <PhaseLegend key={p.key} phase={p} />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">
          Détail des phases indisponible pour cette nuit.
        </p>
      )}
    </div>
  );
}

function PhaseBar({ phases }: { phases: SleepPhase[] }) {
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full">
      {phases.map((p) => (
        <div
          key={p.key}
          style={{ width: `${p.percent}%`, backgroundColor: p.color }}
          title={`${p.label} — ${formatDuration(p.minutes)} (${p.percent}%)`}
        />
      ))}
    </div>
  );
}

function PhaseLegend({ phase }: { phase: SleepPhase }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <span
          className="size-2.5 rounded-sm"
          style={{ backgroundColor: phase.color }}
        />
        <span className="text-xs text-muted-foreground">{phase.label}</span>
      </div>
      <p className="font-mono text-sm font-medium tabular-nums">
        {formatDuration(phase.minutes)}
      </p>
      {phase.ideal && (
        <p className={cn("text-[10px]", TONE_TEXT[phase.tone])}>
          {phase.percent}% · idéal {phase.ideal}
        </p>
      )}
    </div>
  );
}

function AveragesRow({
  view,
  durationOnly = false,
}: {
  view: SleepCoachView;
  durationOnly?: boolean;
}) {
  const { avg } = view;
  const items = durationOnly
    ? [
        {
          label: "Durée moy. 7j",
          value: formatDuration(avg.durationMin),
        },
        {
          label: "Nuits analysées",
          value: `${avg.nights}`,
        },
      ]
    : [
        { label: "Score moy. 7j", value: avg.score != null ? `${avg.score}` : "—" },
        { label: "Durée moy. 7j", value: formatDuration(avg.durationMin) },
        { label: "Profond moy.", value: avg.deepPct != null ? `${avg.deepPct}%` : "—" },
        { label: "REM moy.", value: avg.remPct != null ? `${avg.remPct}%` : "—" },
      ];
  return (
    <div
      className={cn(
        "grid gap-4",
        durationOnly ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4",
      )}
    >
      {items.map((it) => (
        <div key={it.label} className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {it.label}
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">
            {it.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function InsightsList({ insights }: { insights: SleepInsight[] }) {
  if (!insights.length) return null;
  return (
    <div className="space-y-3">
      {insights.map((insight, i) => (
        <div
          key={i}
          className="flex gap-3 rounded-xl border border-border bg-card p-4"
        >
          <span
            className={cn(
              "mt-1.5 size-2 shrink-0 rounded-full",
              TONE_DOT[insight.tone],
            )}
          />
          <div className="space-y-0.5">
            <p className={cn("text-sm font-medium", TONE_TEXT[insight.tone])}>
              {insight.title}
            </p>
            <p className="text-sm text-muted-foreground">{insight.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
