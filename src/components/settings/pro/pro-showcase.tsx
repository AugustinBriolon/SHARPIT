import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  INCLUDED_FOR_EVERYONE,
  PLANNED_PERKS,
  PRO_ONLY_PERKS,
  type ProPerk,
} from '@/components/settings/pro/pro-perks';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { hasProAccess } from '@/lib/access/tier';
import { getAthleteProfile } from '@/lib/queries';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<ProPerk['status'], string> = {
  pro: 'Pro',
  included: 'Inclus',
  planned: 'Bientôt',
};

function ProPerkRow({ perk }: { perk: ProPerk }) {
  const Icon = perk.icon;

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
          <Badge variant={perk.status === 'pro' ? 'highlight' : 'outline'}>
            {STATUS_LABEL[perk.status]}
          </Badge>
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

function PerkGroup({
  id,
  title,
  blurb,
  perks,
}: {
  id: string;
  title: string;
  blurb: string;
  perks: ProPerk[];
}) {
  if (perks.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby={`pro-group-${id}`}>
      <h2 className="text-section-title" id={`pro-group-${id}`}>
        {title}
      </h2>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{blurb}</p>
      <ul className="mt-3 space-y-2">
        {perks.map((perk) => (
          <ProPerkRow key={perk.title} perk={perk} />
        ))}
      </ul>
    </section>
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
            ? 'Tu as accès à tout ce qui est marqué Pro ci-dessous.'
            : "Pro n'est pas encore ouvert à l'inscription — reviens ici quand ce sera possible."}
        </p>
      </section>

      <PerkGroup
        blurb="Ce qui distingue réellement Pro aujourd'hui."
        id="pro"
        perks={PRO_ONLY_PERKS}
        title="Réservé à Pro"
      />

      <PerkGroup
        blurb="Déjà construit, déjà gratuit pour tout le monde — ce n'est pas encore une raison de passer en Pro."
        id="included"
        perks={INCLUDED_FOR_EVERYONE}
        title="Déjà inclus"
      />

      <PerkGroup
        blurb="Sur la feuille de route, pas encore construit."
        id="planned"
        perks={PLANNED_PERKS}
        title="À venir"
      />

      <p className="text-muted-foreground text-xs leading-relaxed">
        Le mode Expert (densité de lecture, dans Apparence) reste gratuit et indépendant du palier
        Pro — c&apos;est une préférence d&apos;affichage, pas une fonctionnalité réservée.
      </p>
    </div>
  );
}
