import { notFound } from "next/navigation";
import { ActivityForm } from "@/components/training/activity-form";
import { getActivityById } from "@/lib/queries";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditTrainingPage({ params }: PageProps) {
  const { id } = await params;
  const activity = await getActivityById(id);

  if (!activity) notFound();

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Training
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
          Modifier la séance
        </h1>
      </header>
      <ActivityForm mode="edit" initialData={activity} />
    </div>
  );
}
