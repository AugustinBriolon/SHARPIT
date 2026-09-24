import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron/verify-cron-secret';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return unauthorized();
  }

  try {
    const athletes = await prisma.athleteProfile.findMany({
      select: {
        id: true,
        clerkUserId: true,
        createdAt: true,
        tier: true,
        displayMode: true,
        _count: {
          select: {
            activities: true,
            plannedSessions: true,
            dayJournals: true,
            goals: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      ok: true,
      count: athletes.length,
      athletes,
    });
  } catch (error) {
    console.error('[cron/reassign-athlete GET]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorized();
  }

  try {
    const body = await request.json().catch(() => ({}));
    let { fromClerkUserId, toClerkUserId } = body as {
      fromClerkUserId?: string;
      toClerkUserId?: string;
      auto?: boolean;
    };

    const athletes = await prisma.athleteProfile.findMany({
      select: {
        id: true,
        clerkUserId: true,
        createdAt: true,
        _count: {
          select: {
            activities: true,
            plannedSessions: true,
            dayJournals: true,
            goals: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // If auto mode or IDs missing, look for the new empty profile and the old rich profile
    if (!fromClerkUserId || !toClerkUserId) {
      const emptyNew = athletes.find(
        (a) =>
          a._count.activities === 0 && a._count.plannedSessions === 0 && a._count.dayJournals === 0,
      );
      const richOld = athletes.find(
        (a) => a._count.activities > 0 || a._count.plannedSessions > 0 || a._count.dayJournals > 0,
      );

      if (!emptyNew || !richOld) {
        return NextResponse.json(
          {
            ok: false,
            error:
              'Could not auto-determine from/to profiles. Provide explicit fromClerkUserId and toClerkUserId.',
            athletes,
          },
          { status: 400 },
        );
      }

      toClerkUserId = emptyNew.clerkUserId;
      fromClerkUserId = richOld.clerkUserId;
    }

    if (fromClerkUserId === toClerkUserId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'fromClerkUserId and toClerkUserId are identical.',
        },
        { status: 400 },
      );
    }

    // Execute transfer in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete the new empty profile if it exists
      const existingNew = await tx.athleteProfile.findUnique({
        where: { clerkUserId: toClerkUserId },
        select: { id: true, _count: { select: { activities: true } } },
      });

      if (existingNew) {
        await tx.athleteProfile.delete({
          where: { id: existingNew.id },
        });
      }

      // 2. Update the old rich profile with the new Clerk user ID
      const updated = await tx.athleteProfile.update({
        where: { clerkUserId: fromClerkUserId },
        data: { clerkUserId: toClerkUserId },
      });

      return {
        deletedTempProfileId: existingNew?.id,
        migratedProfileId: updated.id,
        newClerkUserId: updated.clerkUserId,
      };
    });

    return NextResponse.json({
      ok: true,
      message: 'Profile migrated successfully!',
      result,
    });
  } catch (error) {
    console.error('[cron/reassign-athlete POST]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
