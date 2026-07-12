/**
 * Phase 1 data migration: PhysicalNote / PhysicalCheckin → Physical Health Engine.
 *
 * Idempotent: skips notes already migrated via legacyPhysicalNoteId.
 * Does NOT delete legacy tables.
 *
 * Usage:
 *   tsx scripts/migrate-physical-health-phase1.ts
 *   tsx scripts/migrate-physical-health-phase1.ts --dry-run
 */

import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import {
  extractReassessmentsFromPlannedSessions,
  migrateAllLegacyPhysicalNotes,
  type MigrationReportRow,
} from '@/lib/physical-health/migrate-legacy';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

async function main() {
  const existing = await prisma.condition.findMany({
    where: { legacyPhysicalNoteId: { not: null } },
    select: { legacyPhysicalNoteId: true },
  });
  const migratedNoteIds = new Set(
    existing.map((c) => c.legacyPhysicalNoteId).filter((id): id is string => id != null),
  );

  const notes = await prisma.physicalNote.findMany({
    include: { checkins: { orderBy: { date: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });

  const pending = notes.filter((n) => !migratedNoteIds.has(n.id));

  const sessions = await prisma.plannedSession.findMany({
    where: { analyzedAt: { not: null } },
    select: { id: true, activityId: true, analyzedAt: true, date: true, analysis: true },
  });

  const reassessments = extractReassessmentsFromPlannedSessions(
    sessions.map((s) => ({
      ...s,
      date: new Date(s.date),
    })),
  );

  const legacyNotes = pending.map((n) => ({
    id: n.id,
    category: n.category,
    status: n.status,
    title: n.title,
    bodyPart: n.bodyPart,
    side: n.side,
    severity: n.severity,
    description: n.description,
    affectsTraining: n.affectsTraining,
    startDate: n.startDate,
    resolvedAt: n.resolvedAt,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
    checkins: n.checkins.map((c) => ({
      id: c.id,
      noteId: c.noteId,
      date: c.date,
      severity: c.severity,
      comment: c.comment,
    })),
  }));

  const { bundles, report } = migrateAllLegacyPhysicalNotes(
    legacyNotes,
    reassessments,
    (prefix) => `${prefix}_${randomUUID()}`,
  );

  console.info(`Notes pending migration: ${pending.length}`);
  console.info(`Bundles to write: ${bundles.length}`);
  console.info(`Report rows: ${report.length}`);

  if (dryRun) {
    printReport(report);
    return;
  }

  for (const bundle of bundles) {
    await prisma.$transaction(async (tx) => {
      await tx.condition.create({ data: bundle.condition });
      await tx.conditionEpisode.create({ data: bundle.episode });

      if (bundle.observations.length > 0) {
        await tx.conditionObservation.createMany({ data: bundle.observations });
      }

      if (bundle.functionalCapacities.length > 0) {
        await tx.functionalCapacity.createMany({ data: bundle.functionalCapacities });
      }
    });
  }

  printReport(report);
  console.info('Migration complete.');
}

function printReport(report: MigrationReportRow[]) {
  for (const row of report) {
    console.info(
      `[${row.legacySource}:${row.legacyId}] → ${row.destination}:${row.destinationId} | ${row.transformation}`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
