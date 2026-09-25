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
  ReasoningState,
  PhysicalHealthState,
  EnvironmentalTwinState,
} from '@/core/digital-twin/types';
import {
  deserializeEnvironmentalTwinMeta,
  serializeEnvironmentalTwinMeta,
} from '@/core/inference/environment/serialize';

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
    if (!row?.recoveryState || typeof row.recoveryState !== 'object') {
      return null;
    }
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
    if (!row?.fatigueState || typeof row.fatigueState !== 'object') {
      return null;
    }
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
    if (!row?.adaptationState || typeof row.adaptationState !== 'object') {
      return null;
    }
    return this.deserializeAdaptationState(row.adaptationState as Record<string, unknown>);
  }

  async updateReasoning(athleteId: string, reasoningState: ReasoningState): Promise<DigitalTwin> {
    const serialized = {
      ...reasoningState,
      computedAt: reasoningState.computedAt.toISOString(),
    };
    const row = await this.prisma.digitalTwin.upsert({
      where: { athleteId },
      create: { athleteId, reasoningState: serialized },
      update: { reasoningState: serialized },
    });
    return this.toDomain(row);
  }

  async getPreviousReasoningState(athleteId: string): Promise<ReasoningState | null> {
    const row = await this.prisma.digitalTwin.findUnique({
      where: { athleteId },
      select: { reasoningState: true },
    });
    if (!row?.reasoningState || typeof row.reasoningState !== 'object') {
      return null;
    }
    return this.deserializeReasoningState(row.reasoningState as Record<string, unknown>);
  }

  async updatePhysicalHealth(
    athleteId: string,
    physicalHealthState: PhysicalHealthState,
  ): Promise<DigitalTwin> {
    const serialized = {
      ...physicalHealthState,
      computedAt: physicalHealthState.computedAt.toISOString(),
      conditions: physicalHealthState.conditions.map((c) => ({
        ...c,
        computedAt: c.computedAt.toISOString(),
      })),
    };
    const row = await this.prisma.digitalTwin.upsert({
      where: { athleteId },
      create: { athleteId, physicalHealthState: serialized },
      update: { physicalHealthState: serialized },
    });
    return this.toDomain(row);
  }

  async getPreviousPhysicalHealthState(athleteId: string): Promise<PhysicalHealthState | null> {
    const row = await this.prisma.digitalTwin.findUnique({
      where: { athleteId },
      select: { physicalHealthState: true },
    });
    if (!row?.physicalHealthState || typeof row.physicalHealthState !== 'object') {
      return null;
    }
    return this.deserializePhysicalHealthState(row.physicalHealthState as Record<string, unknown>);
  }

  async updateEnvironmentalState(
    athleteId: string,
    state: EnvironmentalTwinState,
  ): Promise<DigitalTwin> {
    const row = await this.prisma.digitalTwin.upsert({
      where: { athleteId },
      create: {
        athleteId,
        environmentalStressState: state.stress as never,
        environmentalImpactState: state.impact as never,
        environmentalStateMeta: serializeEnvironmentalTwinMeta(state.meta) as never,
      },
      update: {
        environmentalStressState: state.stress as never,
        environmentalImpactState: state.impact as never,
        environmentalStateMeta: serializeEnvironmentalTwinMeta(state.meta) as never,
      },
    });
    return this.toDomain(row);
  }

  async getEnvironmentalState(athleteId: string): Promise<EnvironmentalTwinState | null> {
    const row = await this.prisma.digitalTwin.findUnique({
      where: { athleteId },
      select: {
        environmentalStressState: true,
        environmentalImpactState: true,
        environmentalStateMeta: true,
      },
    });
    return this.deserializeEnvironmentalTwinState(row);
  }

  async getEnvironmentalImpact(
    athleteId: string,
  ): Promise<EnvironmentalTwinState['impact'] | null> {
    const state = await this.getEnvironmentalState(athleteId);
    return state?.impact ?? null;
  }

  private deserializeEnvironmentalTwinState(
    row: {
      environmentalStressState?: unknown;
      environmentalImpactState?: unknown;
      environmentalStateMeta?: unknown;
    } | null,
  ): EnvironmentalTwinState | null {
    if (
      !row?.environmentalStressState ||
      typeof row.environmentalStressState !== 'object' ||
      !row.environmentalImpactState ||
      typeof row.environmentalImpactState !== 'object' ||
      !row.environmentalStateMeta ||
      typeof row.environmentalStateMeta !== 'object'
    ) {
      return null;
    }

    return {
      stress: row.environmentalStressState as EnvironmentalTwinState['stress'],
      impact: row.environmentalImpactState as EnvironmentalTwinState['impact'],
      meta: deserializeEnvironmentalTwinMeta(row.environmentalStateMeta as Record<string, unknown>),
    };
  }

  private toDomain(row: {
    id: string;
    athleteId: string;
    recoveryState: unknown;
    fatigueState?: unknown;
    adaptationState?: unknown;
    reasoningState?: unknown;
    physicalHealthState?: unknown;
    environmentalStressState?: unknown;
    environmentalImpactState?: unknown;
    environmentalStateMeta?: unknown;
    updatedAt: Date;
    createdAt: Date;
  }): DigitalTwin {
    const state: AthleteState = {
      recovery: this.deserializeIfObject(row.recoveryState, (raw) =>
        this.deserializeRecoveryState(raw),
      ),
      fatigue: this.deserializeIfObject(row.fatigueState, (raw) =>
        this.deserializeFatigueState(raw),
      ),
      adaptation: this.deserializeIfObject(row.adaptationState, (raw) =>
        this.deserializeAdaptationState(raw),
      ),
      reasoning: this.deserializeIfObject(row.reasoningState, (raw) =>
        this.deserializeReasoningState(raw),
      ),
      physicalHealth: this.deserializeIfObject(row.physicalHealthState, (raw) =>
        this.deserializePhysicalHealthState(raw),
      ),
      environmental: this.deserializeEnvironmentalTwinState(row),
    };

    return {
      id: row.id,
      athleteId: row.athleteId,
      state,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
    };
  }

  private deserializeIfObject<T>(
    raw: unknown,
    deserialize: (value: Record<string, unknown>) => T,
  ): T | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    return deserialize(raw as Record<string, unknown>);
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

  private deserializeReasoningState(raw: Record<string, unknown>): ReasoningState {
    return {
      ...(raw as Omit<ReasoningState, 'computedAt'>),
      computedAt: new Date(raw.computedAt as string),
    } as ReasoningState;
  }

  private deserializePhysicalHealthState(raw: Record<string, unknown>): PhysicalHealthState {
    const conditions = Array.isArray(raw.conditions)
      ? (raw.conditions as Record<string, unknown>[]).map((c) => ({
          ...(c as Omit<
            import('@/core/inference/physical-health/types').InferredConditionView,
            'computedAt'
          >),
          computedAt: new Date(c.computedAt as string),
        }))
      : [];

    return {
      ...(raw as Omit<PhysicalHealthState, 'computedAt' | 'conditions'>),
      conditions,
      computedAt: new Date(raw.computedAt as string),
    } as PhysicalHealthState;
  }
}
