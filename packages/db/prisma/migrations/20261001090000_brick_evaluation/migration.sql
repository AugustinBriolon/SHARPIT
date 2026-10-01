-- The athlete's own verdict on a whole brick: RPE, transitions, feeling, notes (ADR-059).
CREATE TABLE "BrickEvaluation" (
    "brickGroupId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "rpe" INTEGER,
    "transitionRating" INTEGER,
    "feeling" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrickEvaluation_pkey" PRIMARY KEY ("brickGroupId")
);

CREATE INDEX "BrickEvaluation_athleteId_idx" ON "BrickEvaluation"("athleteId");

ALTER TABLE "BrickEvaluation" ADD CONSTRAINT "BrickEvaluation_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
