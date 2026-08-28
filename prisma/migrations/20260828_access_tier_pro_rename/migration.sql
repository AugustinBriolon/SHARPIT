-- Renames the paid tier value, not its meaning: "Expert" collided with the
-- pre-existing displayMode ('essential' | 'expert') reading-density preference
-- (ADR-023), which is unrelated and stays as-is. Existing EXPERT rows become
-- PRO automatically — this is a value rename, not a new column.
ALTER TYPE "AccessTier" RENAME VALUE 'EXPERT' TO 'PRO';
