import { clerkClient } from '@clerk/nextjs/server';
import { AthleteTierToggle } from '@/components/admin/athlete-tier-toggle';
import { listAthletesForAdmin } from '@/lib/admin/queries';
import { isDevClerkBypass } from '@/lib/dev/dev-auth';

async function emailsByClerkId(clerkUserIds: string[]): Promise<Map<string, string>> {
  if (isDevClerkBypass() || clerkUserIds.length === 0) {
    return new Map();
  }
  const client = await clerkClient();
  const { data } = await client.users.getUserList({
    userId: clerkUserIds,
    limit: clerkUserIds.length,
  });
  return new Map(
    data
      .filter((user) => user.primaryEmailAddress)
      .map((user) => [user.id, user.primaryEmailAddress!.emailAddress]),
  );
}

export default async function AdminPage() {
  const athletes = await listAthletesForAdmin();
  const emails = await emailsByClerkId(athletes.map((athlete) => athlete.clerkUserId));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-label">Admin</p>
        <h1 className="text-page-title mt-1">Athlètes</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {athletes.length} compte{athletes.length > 1 ? 's' : ''} — bascule manuelle du palier en
          attendant Stripe.
        </p>
      </header>

      <div className="analysis-panel divide-analysis-border rounded-analysis-lg divide-y overflow-hidden">
        {athletes.map((athlete) => (
          <div
            key={athlete.id}
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
          >
            <div className="min-w-0">
              <p className="text-card-title truncate">
                {emails.get(athlete.clerkUserId) ?? athlete.clerkUserId}
              </p>
              <p className="text-muted-foreground text-data mt-0.5 text-xs">
                {athlete.id} · depuis le {athlete.createdAt.toLocaleDateString('fr-FR')}
              </p>
            </div>
            <AthleteTierToggle athleteId={athlete.id} tier={athlete.tier} />
          </div>
        ))}
      </div>
    </div>
  );
}
