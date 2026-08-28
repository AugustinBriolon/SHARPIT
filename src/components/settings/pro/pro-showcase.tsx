import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { PRO_PERKS, type ProPerk } from '@/components/settings/pro/pro-perks';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { hasProAccess } from '@/lib/access/tier';
import { getAthleteProfile } from '@/lib/queries';
import { cn } from '@/lib/utils';

function ProPerkRow({ perk }: { perk: ProPerk }) {
  const Icon = perk.icon;
  const live = perk.status === 'live';

  const content = (
    <div
      className={cn(
        'chip-surface-lg rounded-analysis-lg flex items-start gap-3 px-3 py-2.5',
        perk.href && 'hover:border-primary/25',
      )}
    >
      <div className="icon-well size-9 shrink-0" aria-hidden>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-medium">{perk.title}</p>
          <Badge variant={live ? 'highlight' : 'outline'}>{live ? 'Disponible' : 'Bientôt'}</Badge>
        </div>
        <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">{perk.description}</p>
      </div>
    </div>
  );

  if (!perk.href) {
    return <li>{content}</li>;
  }

  return (
    <li>
      <Link
        className="focus-visible:ring-primary/35 rounded-analysis-lg block focus-visible:ring-2 focus-visible:outline-hidden"
        href={perk.href}
      >
        {content}
      </Link>
    </li>
  );
}

/** Server Component — same reasoning as other tier-aware reads: no client
 * round-trip needed for a value that never changes mid-session. */
export async function ProShowcase() {
  const athleteId = await getCurrentAthleteId();
  const profile = await getAthleteProfile(athleteId);
  const isPro = hasProAccess(profile?.tier ?? 'FREE');

  return (
    <div className="space-y-6">
      <section className="analysis-panel rounded-analysis-lg px-5 py-5">
        <p className="text-label">Ton palier</p>
        <div className="mt-2">
          <Badge variant={isPro ? 'highlight' : 'outline'}>{isPro ? 'Pro' : 'Gratuit'}</Badge>
        </div>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          {isPro
            ? 'Tu as accès à tout ce qui est marqué Disponible ci-dessous.'
            : "Pro n'est pas encore ouvert à l'inscription — reviens ici quand ce sera possible."}
        </p>
      </section>

      <section aria-labelledby="pro-perks">
        <h2 className="text-section-title" id="pro-perks">
          Ce que Pro apporte
        </h2>
        <ul className="mt-3 space-y-2">
          {PRO_PERKS.map((perk) => (
            <ProPerkRow key={perk.title} perk={perk} />
          ))}
        </ul>
      </section>

      <p className="text-muted-foreground text-xs leading-relaxed">
        Le mode Expert (densité de lecture, dans Apparence) reste gratuit et indépendant du palier
        Pro — c&apos;est une préférence d&apos;affichage, pas une fonctionnalité réservée.
      </p>
    </div>
  );
}
