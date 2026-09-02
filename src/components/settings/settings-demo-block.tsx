import { Lock } from 'lucide-react';
import Link from 'next/link';
import { DemoExitButton } from '@/components/demo/demo-exit';
import { Button } from '@/components/ui/button';

/**
 * Reusable "Indisponible en démo" dead-end — one per settings page that
 * touches a real account (identity, integrations write-side, calibration,
 * equipment, coach memory). Settings/Pro and Settings/Integrations render
 * their own read-only content instead of this block (ADR-026 follow-up).
 */
export function SettingsDemoBlock({ description }: { description: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <Lock className="text-muted-foreground size-6" aria-hidden />
      </div>
      <div>
        <h1 className="text-page-title">Indisponible en démo</h1>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <DemoExitButton />
        <Button nativeButton={false} render={<Link href="/moi" />} variant="outline">
          Retour à Moi
        </Button>
      </div>
    </div>
  );
}
