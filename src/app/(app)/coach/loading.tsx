import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-[60vh] w-full rounded-2xl" />
    </div>
  );
}
