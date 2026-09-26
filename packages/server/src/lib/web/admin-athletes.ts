import { clerkClient } from '@clerk/nextjs/server';
import { type AdminAthleteRow, listAthletesForAdmin } from '@sharpit/server/lib/admin/queries';
import { isDevClerkBypass } from '@sharpit/server/lib/dev/dev-auth';

export type AdminAthleteView = AdminAthleteRow & { email: string | null };

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

/** The /admin athlete list with each account's email (operator tooling, admins only). */
export async function loadAdminAthletes(): Promise<AdminAthleteView[]> {
  const athletes = await listAthletesForAdmin();
  const emails = await emailsByClerkId(athletes.map((athlete) => athlete.clerkUserId));
  return athletes.map((athlete) => ({
    ...athlete,
    email: emails.get(athlete.clerkUserId) ?? null,
  }));
}
