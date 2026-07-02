/**
 * DIGITAL TWIN — Prisma Implementation
 *
 * Implements the DigitalTwinRepository port using Prisma.
 * One row per athlete in the `DigitalTwin` table.
 *
 * The `recoveryState` column stores the full RecoveryState JSON.
 * Future models append their own nullable columns (no migration required).
 */

import type { PrismaClient } from '@prisma/client';
import type { DigitalTwinRepository } from '@/core/digital-twin/repository';
import type {
  DigitalTwin,
  AthleteState,
  RecoveryState,
  FatigueState,
  AdaptationState,
} from '@/core/digital-twin/types';

export class PrismaDigitalTwinRepository implements DigitalTwinRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findOrCreate(athleteId: string): Promise<DigitalTwin> {
    const row = await this.prisma.digitalTwin.upsert({
      where: { athleteId },
      create: { athleteId },
      update: {},
    });
    return this.toDomain(row);
  }

  async updateRecovery(athleteId: string, recoveryState: RecoveryState): Promise<DigitalTwin> {
    const serialized = {
      ...recoveryState,
      computedAt: recoveryState.computedAt.toISOString(),
    };
    const row = await this.prisma.digitalTwin.upsert({
      where: { athleteId },
      create: { athleteId, recoveryState: serialized },
      update: { recoveryState: serialized },
    });
    return this.toDomain(row);
  }

  async getPreviousRecoveryScore(athleteId: string): Promise<number | null> {
    const row = await this.prisma.digitalTwin.findUnique({
      where: { athleteId },
      select: { recoveryState: true },
    });
    if (!row?.recoveryState || typeof row.recoveryState !== 'object') return null;
    const state = row.recoveryState as { readinessScore?: number | null };
    return state.readinessScore ?? null;
  }

  async updateFatigue(athleteId: string, fatigueState: FatigueState): Promise<DigitalTwin> {
    const serialized = {
      ...fatigueState,
      computedAt: fatigueState.computedAt.toISOString(),
    };
    const row = await this.prisma.digitalTwin.upsert({
      where: { athleteId },
      create: { athleteId, fatigueState: serialized },
      update: { fatigueState: serialized },
    });
    return this.toDomain(row);
  }

  async getPreviousFatigueState(athleteId: string): Promise<FatigueState | null> {
    const row = await this.prisma.digitalTwin.findUnique({
      where: { athleteId },
      select: { fatigueState: true },
    });
    if (!row?.fatigueState || typeof row.fatigueState !== 'object') return null;
    return this.deserializeFatigueState(row.fatigueState as Record<string, unknown>);
  }

  async updateAdaptation(
    athleteId: string,
    adaptationState: AdaptationState,
  ): Promise<DigitalTwin> {
    const serialized = {
      ...adaptationState,
      computedAt: adaptationState.computedAt.toISOString(),
    };
    const row = await this.prisma.digitalTwin.upsert({
      where: { athleteId },
      create: { athleteId, adaptationState: serialized },
      update: { adaptationState: serialized },
    });
    return this.toDomain(row);
  }

  async getPreviousAdaptationState(athleteId: string): Promise<AdaptationState | null> {
    const row = await this.prisma.digitalTwin.findUnique({
      where: { athleteId },
      select: { adaptationState: true },
    });
    if (!row?.adaptationState || typeof row.adaptationState !== 'object') return null;
    return this.deserializeAdaptationState(row.adaptationState as Record<string, unknown>);
  }

  private toDomain(row: {
    id: string;
    athleteId: string;
    recoveryState: unknown;
    fatigueState?: unknown;
    adaptationState?: unknown;
    updatedAt: Date;
    createdAt: Date;
  }): DigitalTwin {
    const recoveryState =
      row.recoveryState && typeof row.recoveryState === 'object'
        ? this.deserializeRecoveryState(row.recoveryState as Record<string, unknown>)
        : null;

    const fatigueState =
      row.fatigueState && typeof row.fatigueState === 'object'
        ? this.deserializeFatigueState(row.fatigueState as Record<string, unknown>)
        : null;

    const adaptationState =
      row.adaptationState && typeof row.adaptationState === 'object'
        ? this.deserializeAdaptationState(row.adaptationState as Record<string, unknown>)
        : null;

    const state: AthleteState = {
      recovery: recoveryState,
      fatigue: fatigueState,
      adaptation: adaptationState,
    };

    return {
      id: row.id,
      athleteId: row.athleteId,
      state,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
    };
  }

  private deserializeRecoveryState(raw: Record<string, unknown>): RecoveryState {
    return {
      ...(raw as Omit<RecoveryState, 'computedAt'>),
      computedAt: new Date(raw.computedAt as string),
    } as RecoveryState;
  }

  private deserializeFatigueState(raw: Record<string, unknown>): FatigueState {
    return {
      ...(raw as Omit<FatigueState, 'computedAt'>),
      computedAt: new Date(raw.computedAt as string),
    } as FatigueState;
  }

  private deserializeAdaptationState(raw: Record<string, unknown>): AdaptationState {
    return {
      ...(raw as Omit<AdaptationState, 'computedAt'>),
      computedAt: new Date(raw.computedAt as string),
    } as AdaptationState;
  }
}
