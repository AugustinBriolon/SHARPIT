-- Replace abused OAuth-shaped MFP credential fields with an encrypted session cookie.
-- Table has 0 rows in every environment (MFP was never successfully connected via
-- the old username + public diary-key flow), so this is a safe destructive rename.
--
-- An email+password credentials-login variant of this migration was tried and
-- reverted before commit: MFP's next-auth credentials endpoint requires solving a
-- reCAPTCHA server-side, which a plain server-to-server fetch cannot satisfy
-- (verified: POST /api/auth/callback/credentials returns error=RecaptchaFailed
-- unconditionally). See ADR-013.
DROP INDEX IF EXISTS "MyFitnessPalAccount_userId_key";

ALTER TABLE "MyFitnessPalAccount"
  DROP COLUMN "userId",
  DROP COLUMN "accessToken",
  DROP COLUMN "refreshToken",
  DROP COLUMN "expiresAt",
  ADD COLUMN "sessionTokenEnc" TEXT NOT NULL;
