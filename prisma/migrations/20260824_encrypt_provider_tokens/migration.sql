-- Provider credentials move to application-level encryption (secret-box.ts,
-- SECRET_ENCRYPTION_KEY). Existing plaintext values (Garmin/Strava/Withings/
-- Google) and values encrypted under the old CRON_SECRET-derived key
-- (Renpho/MyFitnessPal) cannot be carried forward under the new key — every
-- connected athlete reconnects each provider once after this deploys.

-- Strava
ALTER TABLE "StravaAccount" RENAME COLUMN "accessToken" TO "accessTokenEnc";
ALTER TABLE "StravaAccount" RENAME COLUMN "refreshToken" TO "refreshTokenEnc";
UPDATE "StravaAccount" SET "accessTokenEnc" = '', "refreshTokenEnc" = '', "expiresAt" = to_timestamp(0);

-- Withings
ALTER TABLE "WithingsAccount" RENAME COLUMN "accessToken" TO "accessTokenEnc";
ALTER TABLE "WithingsAccount" RENAME COLUMN "refreshToken" TO "refreshTokenEnc";
UPDATE "WithingsAccount" SET "accessTokenEnc" = '', "refreshTokenEnc" = '', "expiresAt" = to_timestamp(0);

-- Google
ALTER TABLE "GoogleAccount" RENAME COLUMN "accessToken" TO "accessTokenEnc";
ALTER TABLE "GoogleAccount" RENAME COLUMN "refreshToken" TO "refreshTokenEnc";
UPDATE "GoogleAccount" SET "accessTokenEnc" = '', "refreshTokenEnc" = '', "expiresAt" = to_timestamp(0);

-- Garmin — oauth1Token/oauth2Token were jsonb; the encrypted replacement is
-- opaque text, so this is a type change, not just a rename.
ALTER TABLE "GarminAccount" RENAME COLUMN "oauth1Token" TO "oauth1TokenEnc";
ALTER TABLE "GarminAccount" RENAME COLUMN "oauth2Token" TO "oauth2TokenEnc";
ALTER TABLE "GarminAccount" ALTER COLUMN "oauth1TokenEnc" TYPE TEXT USING '';
ALTER TABLE "GarminAccount" ALTER COLUMN "oauth2TokenEnc" TYPE TEXT USING '';
UPDATE "GarminAccount" SET "oauth1TokenEnc" = '', "oauth2TokenEnc" = '';

-- Renpho / MyFitnessPal — already encrypted, but under the old key. No column
-- shape change, just wipe so a stale ciphertext never gets fed to the new key.
UPDATE "RenphoAccount" SET "passwordEnc" = '';
UPDATE "MyFitnessPalAccount" SET "sessionTokenEnc" = '';
