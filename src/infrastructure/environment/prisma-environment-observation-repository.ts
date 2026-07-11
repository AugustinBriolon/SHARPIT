/**
 * Environmental observations — Prisma repository (Phase 2).
 */

import type { PrismaClient } from '@prisma/client';
import type { EnvironmentalObservationRepository } from '@/core/inference/environment/repository';
import type { EnvironmentalObservationRecord } from '@/core/environment';
import { isRecordActive } from '@/core/environment';
import {
  deserializeEnvironmentalObservationRecord,
  serializeEnvironmentalObservationRecord,
} from '@/core/inference/environment/serialize';

export class PrismaEnvironmentalObservationRepository implements EnvironmentalObservationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async saveMany(records: readonly EnvironmentalObservationRecord[]): Promise<void> {
    if (records.length === 0) return;

    await this.prisma.$transaction(
      records.map((record) =>
        this.prisma.environmentalObservationRecord.upsert({
          where: { id: record.id },
          create: serializeEnvironmentalObservationRecord(record) as never,
          update: serializeEnvironmentalObservationRecord(record) as never,
        }),
      ),
    );
  }

  async findActiveForTrainingDay(
    athleteId: string,
    trainingDayId: string,
  ): Promise<EnvironmentalObservationRecord[]> {
    const rows = await this.prisma.environmentalObservationRecord.findMany({
      where: { athleteId, trainingDayId, supersededBy: null },
      orderBy: { observedAt: 'asc' },
    });

    return rows
      .map((row) =>
        deserializeEnvironmentalObservationRecord(row as unknown as Record<string, unknown>),
      )
      .filter(isRecordActive);
  }

  async findByIds(ids: readonly string[]): Promise<EnvironmentalObservationRecord[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.environmentalObservationRecord.findMany({
      where: { id: { in: [...ids] } },
    });
    return rows
      .map((row) =>
        deserializeEnvironmentalObservationRecord(row as unknown as Record<string, unknown>),
      )
      .filter(isRecordActive);
  }

  async supersedeRecord(recordId: string, supersededById: string): Promise<void> {
    await this.prisma.environmentalObservationRecord.update({
      where: { id: recordId },
      data: { supersededBy: supersededById },
    });
  }
}
