-- AlterTable: métriques Body Scan Withings
ALTER TABLE "BodyCompositionMeasurement" ADD COLUMN "vascularAgeYears" INTEGER;
ALTER TABLE "BodyCompositionMeasurement" ADD COLUMN "pulseWaveVelocity" DOUBLE PRECISION;
ALTER TABLE "BodyCompositionMeasurement" ADD COLUMN "vo2Max" DOUBLE PRECISION;
ALTER TABLE "BodyCompositionMeasurement" ADD COLUMN "nerveHealthScore" DOUBLE PRECISION;
ALTER TABLE "BodyCompositionMeasurement" ADD COLUMN "nerveHealthLeft" DOUBLE PRECISION;
ALTER TABLE "BodyCompositionMeasurement" ADD COLUMN "nerveHealthRight" DOUBLE PRECISION;
ALTER TABLE "BodyCompositionMeasurement" ADD COLUMN "nerveResponseScore" DOUBLE PRECISION;
ALTER TABLE "BodyCompositionMeasurement" ADD COLUMN "skinConductance" DOUBLE PRECISION;
ALTER TABLE "BodyCompositionMeasurement" ADD COLUMN "metabolicAge" INTEGER;
ALTER TABLE "BodyCompositionMeasurement" ADD COLUMN "hydrationKg" DOUBLE PRECISION;
ALTER TABLE "BodyCompositionMeasurement" ADD COLUMN "fatMassKg" DOUBLE PRECISION;
ALTER TABLE "BodyCompositionMeasurement" ADD COLUMN "extracellularWaterKg" DOUBLE PRECISION;
ALTER TABLE "BodyCompositionMeasurement" ADD COLUMN "intracellularWaterKg" DOUBLE PRECISION;
ALTER TABLE "BodyCompositionMeasurement" ADD COLUMN "withingsExtras" JSONB;
