-- Analyse globale d'un brick (enchaînement multisport) : une analyse par
-- brickGroupId qui agrège les jambes (transitions, dérive cardiaque, gestion).
CREATE TABLE "BrickAnalysis" (
    "brickGroupId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrickAnalysis_pkey" PRIMARY KEY ("brickGroupId")
);
