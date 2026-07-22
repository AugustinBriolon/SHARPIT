import Link from 'next/link';
import { ChevronRight, Dumbbell } from 'lucide-react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { PersonalProfilePanel, type ProfileData } from '@/components/settings/profile';
import { cn } from '@/lib/utils';

export function ProfileView({ initial }: { initial: ProfileData | null }) {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Réglages" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Profil</p>
        <h1 className="text-page-title mt-1">Mon profil</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Identité et rythme de vie — les repères de performance sont dans Progression.
        </p>
      </StickyHeader>

      <PersonalProfilePanel initial={initial} />

      <Link
        href="/settings/equipment"
        className={cn(
          'analysis-panel group rounded-analysis-lg flex items-center gap-3 px-3 py-2.5 transition-colors',
          'hover:border-primary/25 hover:bg-analysis-surface-alt/80',
        )}
      >
        <div className="icon-well size-9 rounded-lg">
          <Dumbbell className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Équipement</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Matériel par sport pour adapter la génération de séances.
          </p>
        </div>
        <ChevronRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
