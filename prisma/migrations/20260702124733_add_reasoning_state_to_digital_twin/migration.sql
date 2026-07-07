-- Add reasoningState column to DigitalTwin
-- Reasoning Engine v1 — cross-model synthesis state

ALTER TABLE "DigitalTwin" ADD COLUMN "reasoningState" JSONB;
