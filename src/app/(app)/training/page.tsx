import { StickyHeader } from "@/components/layout/sticky-header";
import { TrainingList } from "@/components/training/training-list";
import { LinkButton } from "@/components/ui/link-button";

export default function TrainingPage() {
  return (
    <div className="space-y-8">
      <StickyHeader className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Training
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
            Séances
          </h1>
          <p className="mt-1 text-muted-foreground">
            Course, vélo, natation et musculation — tout est historisé.
          </p>
        </div>
        <LinkButton href="/training/new">Nouvelle séance</LinkButton>
      </StickyHeader>

      <TrainingList />
    </div>
  );
}
