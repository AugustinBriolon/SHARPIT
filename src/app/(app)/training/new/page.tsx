import { StickyHeader } from "@/components/layout/sticky-header";
import { ActivityForm } from "@/components/training/activity-form";

export default function NewTrainingPage() {
  return (
    <div className="space-y-8">
      <StickyHeader>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Training
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
          Nouvelle séance
        </h1>
      </StickyHeader>
      <ActivityForm mode="create" />
    </div>
  );
}
