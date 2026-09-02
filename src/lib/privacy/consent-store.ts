import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  canUseAiProcessingFromProfile,
  mustGrantHealthConsent,
  needsConsentWallFromProfile,
} from '@/lib/privacy/consent';
import {
  AI_CONSENT_REQUIRED_MESSAGE,
  CURRENT_PRIVACY_VERSION,
  PROVIDER_CONSENT_REQUIRED_MESSAGE,
} from '@/lib/privacy/constants';
import { providerConnectRequirements } from '@/lib/privacy/provider-classification';
import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import { DEMO_CLERK_USER_ID, isDemoSession } from '@/lib/demo/demo-session';
import { isDevClerkBypass } from '@/lib/dev/dev-auth';

const CONSENT_SELECT = {
  termsAcceptedAt: true,
  privacyAcceptedAt: true,
  privacyVersion: true,
  healthDataConsentAt: true,
  aiProcessingConsentAt: true,
  unofficialProvidersAckAt: true,
  deletedAt: true,
  clerkUserId: true,
} as const;

export type AthleteConsentRow = {
  termsAcceptedAt: Date | null;
  privacyAcceptedAt: Date | null;
  privacyVersion: string | null;
  healthDataConsentAt: Date | null;
  aiProcessingConsentAt: Date | null;
  unofficialProvidersAckAt: Date | null;
  deletedAt: Date | null;
  clerkUserId: string;
};

export async function getAthleteConsentRow(athleteId: string): Promise<AthleteConsentRow | null> {
  return prisma.athleteProfile.findUnique({
    where: { id: athleteId },
    select: CONSENT_SELECT,
  });
}

/** Santé providers linked and/or Art. 9 observation rows already in DB. */
export async function getAthleteHealthExposure(athleteId: string): Promise<{
  hasSanteProvidersLinked: boolean;
  hasHealthRows: boolean;
}> {
  const [garmin, withings, renpho, myfitnesspal, dailyHealth, bodyComposition, dailyNutrition] =
    await Promise.all([
      prisma.garminAccount.findUnique({ where: { athleteId }, select: { athleteId: true } }),
      prisma.withingsAccount.findUnique({ where: { athleteId }, select: { athleteId: true } }),
      prisma.renphoAccount.findUnique({ where: { athleteId }, select: { athleteId: true } }),
      prisma.myFitnessPalAccount.findUnique({ where: { athleteId }, select: { athleteId: true } }),
      prisma.dailyHealth.findFirst({ where: { athleteId }, select: { id: true } }),
      prisma.bodyCompositionMeasurement.findFirst({ where: { athleteId }, select: { id: true } }),
      prisma.dailyNutrition.findFirst({ where: { athleteId }, select: { id: true } }),
    ]);

  return {
    hasSanteProvidersLinked: Boolean(garmin || withings || renpho || myfitnesspal),
    hasHealthRows: Boolean(dailyHealth || bodyComposition || dailyNutrition),
  };
}

/**
 * Soft wall: CGU + Privacy + health_data_consent required before Today.
 * Also forces when santé providers / health rows exist without consent (A).
 */
export async function athleteNeedsLegalConsent(athleteId: string): Promise<boolean> {
  if (await isDemoSession()) {
    return false;
  }
  if (isDevClerkBypass()) {
    return false;
  }

  const profile = await getAthleteConsentRow(athleteId);
  if (!profile || profile.clerkUserId === DEMO_CLERK_USER_ID) {
    return false;
  }
  if (profile.deletedAt) {
    return false;
  }

  if (
    needsConsentWallFromProfile({
      termsAcceptedAt: profile.termsAcceptedAt,
      privacyAcceptedAt: profile.privacyAcceptedAt,
      privacyVersion: profile.privacyVersion,
      healthDataConsentAt: profile.healthDataConsentAt,
      currentPrivacyVersion: CURRENT_PRIVACY_VERSION,
      isDemo: false,
      isDevBypass: false,
    })
  ) {
    return true;
  }

  // Defense-in-depth for legacy exposure if wall logic drifts.
  const exposure = await getAthleteHealthExposure(athleteId);
  return mustGrantHealthConsent({
    healthDataConsentAt: profile.healthDataConsentAt,
    ...exposure,
  });
}

export async function athleteHasAiProcessingConsent(athleteId: string): Promise<boolean> {
  if ((await isDemoSession()) || isDevClerkBypass()) {
    return true;
  }
  const profile = await getAthleteConsentRow(athleteId);
  if (!profile || profile.clerkUserId === DEMO_CLERK_USER_ID) {
    return true;
  }
  return canUseAiProcessingFromProfile(profile);
}

export async function athleteHasHealthDataConsent(athleteId: string): Promise<boolean> {
  if ((await isDemoSession()) || isDevClerkBypass()) {
    return true;
  }
  const profile = await getAthleteConsentRow(athleteId);
  if (!profile || profile.clerkUserId === DEMO_CLERK_USER_ID) {
    return true;
  }
  return Boolean(profile.healthDataConsentAt);
}

export function canConnectProviderFromConsents(
  profile: Pick<AthleteConsentRow, 'healthDataConsentAt' | 'unofficialProvidersAckAt'>,
  integrationId: IntegrationId,
): boolean {
  const req = providerConnectRequirements(integrationId);
  if (req.needsHealthConsent && !profile.healthDataConsentAt) {
    return false;
  }
  if (req.needsUnofficialAck && !profile.unofficialProvidersAckAt) {
    return false;
  }
  return true;
}

export async function athleteCanConnectProvider(
  athleteId: string,
  integrationId: IntegrationId,
): Promise<boolean> {
  if ((await isDemoSession()) || isDevClerkBypass()) {
    return true;
  }
  const profile = await getAthleteConsentRow(athleteId);
  if (!profile || profile.clerkUserId === DEMO_CLERK_USER_ID) {
    return true;
  }
  return canConnectProviderFromConsents(profile, integrationId);
}

/** 403 JSON when AI consent is missing — for LLM coach / briefing routes. */
export async function requireAiProcessingConsent(athleteId: string): Promise<NextResponse | null> {
  if (await athleteHasAiProcessingConsent(athleteId)) {
    return null;
  }
  return NextResponse.json(
    { error: AI_CONSENT_REQUIRED_MESSAGE, code: 'ai_processing_consent_required' },
    { status: 403 },
  );
}

/** 403 JSON when provider connect consents are missing for this integration. */
export async function requireProviderConnectConsent(
  athleteId: string,
  integrationId: IntegrationId,
): Promise<NextResponse | null> {
  if (await athleteCanConnectProvider(athleteId, integrationId)) {
    return null;
  }
  return NextResponse.json(
    { error: PROVIDER_CONSENT_REQUIRED_MESSAGE, code: 'provider_consent_required' },
    { status: 403 },
  );
}

export type ConsentUpdateInput = {
  acceptLegal?: boolean;
  healthDataConsent?: boolean;
  aiProcessingConsent?: boolean;
  unofficialProvidersAck?: boolean;
};

export async function updateAthleteConsents(
  athleteId: string,
  input: ConsentUpdateInput,
): Promise<AthleteConsentRow> {
  const now = new Date();
  const data: {
    termsAcceptedAt?: Date;
    privacyAcceptedAt?: Date;
    privacyVersion?: string;
    healthDataConsentAt?: Date | null;
    aiProcessingConsentAt?: Date | null;
    unofficialProvidersAckAt?: Date | null;
  } = {};

  if (input.acceptLegal) {
    data.termsAcceptedAt = now;
    data.privacyAcceptedAt = now;
    data.privacyVersion = CURRENT_PRIVACY_VERSION;
  }
  if (input.healthDataConsent === true) {
    data.healthDataConsentAt = now;
  }
  if (input.healthDataConsent === false) {
    data.healthDataConsentAt = null;
  }
  if (input.aiProcessingConsent === true) {
    data.aiProcessingConsentAt = now;
  }
  if (input.aiProcessingConsent === false) {
    data.aiProcessingConsentAt = null;
  }
  if (input.unofficialProvidersAck === true) {
    data.unofficialProvidersAckAt = now;
  }
  if (input.unofficialProvidersAck === false) {
    data.unofficialProvidersAckAt = null;
  }

  return prisma.athleteProfile.update({
    where: { id: athleteId },
    data,
    select: CONSENT_SELECT,
  });
}
