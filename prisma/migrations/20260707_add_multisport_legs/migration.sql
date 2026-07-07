-- Colonne peut déjà exister si un db push a été fait avant le premier deploy.
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "multisportLegs" JSONB;
