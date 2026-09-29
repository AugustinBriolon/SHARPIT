-- Apple Health has no account to connect: the iPhone app says when it is linked (ADR-054).
ALTER TABLE "AthleteProfile" ADD COLUMN "appleHealthLinkedAt" TIMESTAMP(3);
