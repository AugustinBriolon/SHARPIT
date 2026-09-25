import { afterEach, describe, expect, it } from 'vitest';
import {
  SecretDecryptError,
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
  isSecretAuthenticityFailure,
  isSecretDecryptFailure,
  isSecretMalformedFailure,
} from '@/lib/secret-box';

const ORIGINAL_KEY = process.env.SECRET_ENCRYPTION_KEY;

afterEach(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.SECRET_ENCRYPTION_KEY;
  } else {
    process.env.SECRET_ENCRYPTION_KEY = ORIGINAL_KEY;
  }
});

describe('isEncryptedSecret', () => {
  it('rejects empty, nullish, and placeholder values that decode below AES-GCM framing', () => {
    expect(isEncryptedSecret('')).toBe(false);
    expect(isEncryptedSecret(null)).toBe(false);
    expect(isEncryptedSecret(undefined)).toBe(false);
    expect(isEncryptedSecret('demo')).toBe(false);
    expect(isEncryptedSecret('x')).toBe(false);
    expect(isEncryptedSecret('!!!not-base64!!!')).toBe(false);
  });

  it('accepts a real encryptSecret payload', () => {
    process.env.SECRET_ENCRYPTION_KEY = 'test-key-for-secret-box';
    expect(isEncryptedSecret(encryptSecret('token'))).toBe(true);
  });
});

describe('decryptSecret', () => {
  it('round-trips a plaintext secret', () => {
    process.env.SECRET_ENCRYPTION_KEY = 'test-key-for-secret-box';
    expect(decryptSecret(encryptSecret('garmin-oauth'))).toBe('garmin-oauth');
  });

  it('throws malformed SecretDecryptError for empty/short placeholders (no auth-tag noise)', () => {
    process.env.SECRET_ENCRYPTION_KEY = 'test-key-for-secret-box';
    for (const value of ['', 'demo', 'x']) {
      expect(() => decryptSecret(value)).toThrow(SecretDecryptError);
      try {
        decryptSecret(value);
      } catch (error) {
        expect(isSecretMalformedFailure(error)).toBe(true);
        expect(isSecretAuthenticityFailure(error)).toBe(false);
        expect((error as Error).message).not.toMatch(/authentication tag length/i);
      }
    }
  });

  it('throws authenticity SecretDecryptError when ciphertext was encrypted with a different key', () => {
    process.env.SECRET_ENCRYPTION_KEY = 'key-a';
    const blob = encryptSecret('provider-token');
    process.env.SECRET_ENCRYPTION_KEY = 'key-b';
    expect(() => decryptSecret(blob)).toThrow(SecretDecryptError);
    try {
      decryptSecret(blob);
    } catch (error) {
      expect(isSecretAuthenticityFailure(error)).toBe(true);
      expect(isSecretMalformedFailure(error)).toBe(false);
      expect(isSecretDecryptFailure(error)).toBe(true);
    }
  });
});
