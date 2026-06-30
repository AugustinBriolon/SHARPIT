import { StickyHeader } from '@/components/layout/sticky-header';
import { TrainingList } from '@/components/training/training-list';
import { LinkButton } from '@/components/ui/link-button';

export default function TrainingPage() {
  return (
    <div className="space-y-8">
      <StickyHeader className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary text-xs font-medium tracking-[0.2em] uppercase">Training</p>
          <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight">Séances</h1>
          <p className="text-muted-foreground mt-1">
            Course, vélo, natation et musculation — tout est historisé.
          </p>
        </div>
        <LinkButton href="/training/new">Nouvelle séance</LinkButton>
      </StickyHeader>

      <TrainingList />
    </div>
  );
}
