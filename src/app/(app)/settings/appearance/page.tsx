import { Monitor, Moon, Sun } from 'lucide-react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { Badge } from '@/components/ui/badge';

const OPTIONS = [
  {
    title: 'Clair',
    description: 'Palette claire pour un usage diurne.',
    icon: Sun,
  },
  {
    title: 'Sombre',
    description: 'Palette sombre pour réduire la distraction visuelle.',
    icon: Moon,
  },
  {
    title: 'Système',
    description: 'Suit automatiquement la préférence du système.',
    icon: Monitor,
  },
] as const;

export default function SettingsAppearancePage() {
  return (
    <div className="space-y-4">
      <StickyHeader>
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Réglages
        </p>
        <h1 className="font-heading mt-1 text-2xl font-semibold">Apparence</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Prépare le thème natif de l’application. Le branchement fonctionnel arrive dans la phase
          suivante.
        </p>
      </StickyHeader>

      <div className="space-y-3">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <section key={option.title} className="rounded-2xl border px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="text-muted-foreground size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{option.title}</p>
                    <Badge variant="outline">Bientôt</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">{option.description}</p>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
