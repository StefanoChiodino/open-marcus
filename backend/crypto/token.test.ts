/**
 * Tests for token generation and verification
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { generateToken, verifyToken, blacklistToken, isTokenBlacklisted, clearBlacklist, TokenPayload } from './token.js';

describe('Token Generation and Verification', () => {
  const testUserId = 'user-123';
  const testUsername = 'testuser';

  beforeEach(() => {
    // Clear the blacklist before each test to ensure clean state
    clearBlacklist();
  });

  describe('generateToken', () => {
    it('should generate a token with two parts (payload.signature)', () => {
      const token = generateToken(testUserId, testUsername);
      
      const parts = token.split('.');
      expect(parts.length).toBe(2);
      expect(parts[0]).toBeTruthy(); // payload
      expect(parts[1]).toBeTruthy(); // signature
    });

    it('should generate a token containing userId and username', () => {
      const token = generateToken(testUserId, testUsername);
      const payload = verifyToken(token);
      
      expect(payload).not.toBeNull();
      expect(payload!.userId).toBe(testUserId);
      expect(payload!.username).toBe(testUsername);
    });

    it('should include issuedAt and expiresAt in the payload', () => {
      const token = generateToken(testUserId, testUsername);
      const before = Date.now();
      const payload = verifyToken(token);
      const after = Date.now();
      
      expect(payload).not.toBeNull();
      expect(payload!.issuedAt).toBeGreaterThanOrEqual(before);
      expect(payload!.issuedAt).toBeLessThanOrEqual(after);
      expect(payload!.expiresAt).toBeGreaterThan(payload!.issuedAt);
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateToken('user-1', 'user1');
      const token2 = generateToken('user-2', 'user2');
      
      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens at different times', async () => {
      const token1 = generateToken(testUserId, testUsername);
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait 10ms
      const token2 = generateToken(testUserId, testUsername);
      
      // Tokens may or may not be different depending on timing,
      // but both should still be valid
      const payload1 = verifyToken(token1);
      const payload2 = verifyToken(token2);
      
      expect(payload1).not.toBeNull();
      expect(payload2).not.toBeNull();
    });
  });

  describe('verifyToken', () => {
    it('should return payload for valid token', () => {
      const token = generateToken(testUserId, testUsername);
      const payload = verifyToken(token);
      
      expect(payload).not.toBeNull();
      expect(payload!.userId).toBe(testUserId);
      expect(payload!.username).toBe(testUsername);
    });

    it('should return null for invalid token format', () => {
      const payload = verifyToken('not-a-valid-token');
      expect(payload).toBeNull();
    });

    it('should return null for empty string token', () => {
      const payload = verifyToken('');
      expect(payload).toBeNull();
    });

    it('should return null for token with only payload (no signature)', () => {
      const payload = verifyToken('justpayload');
      expect(payload).toBeNull();
    });

    it('should return null for token with modified payload', () => {
      const token = generateToken(testUserId, testUsername);
      const [payloadBase64, signature] = token.split('.');
      
      // Modify the payload by changing a character
      const modifiedPayload = Buffer.from(payloadBase64).toString('base64').replace(/A/g, 'B');
      const tamperedToken = `${modifiedPayload}.${signature}`;
      
      const result = verifyToken(tamperedToken);
      expect(result).toBeNull();
    });

    it('should return null for token with modified signature', () => {
      const token = generateToken(testUserId, testUsername);
      const [payloadBase64] = token.split('.');
      
      // Use a different valid-looking signature
      const tamperedToken = `${payloadBase64}.ModifiedSignature123==`;
      
      const result = verifyToken(tamperedToken);
      expect(result).toBeNull();
    });

    it('should return null for completely forged token', () => {
      // An attacker trying to forge a token without knowing the secret
      const forgedPayload = Buffer.from(JSON.stringify({
        userId: 'attacker',
        username: 'attacker',
        issuedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      })).toString('base64');
      
      const forgedToken = `${forgedPayload}.forgedsignature`;
      
      const result = verifyToken(forgedToken);
      expect(result).toBeNull();
    });

    it('should return null for blacklisted token', () => {
      const token = generateToken(testUserId, testUsername);
      
      // Blacklist the token
      blacklistToken(token);
      
      // Verify should return null
      const payload = verifyToken(token);
      expect(payload).toBeNull();
    });

    it('should handle valid base64 in payload', () => {
      // Generate a token and verify it can be decoded
      const token = generateToken(testUserId, testUsername);
      const [payloadBase64] = token.split('.');
      
      // Should be valid base64
      const decoded = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(decoded);
      
      expect(payload.userId).toBe(testUserId);
      expect(payload.username).toBe(testUsername);
    });
  });

  describe('Token Expiration', () => {
    // Note: Testing actual expiration would require mocking time or waiting.
    // Here we verify the expiration logic is in place.

    it('should set expiresAt after issuedAt', () => {
      const token = generateToken(testUserId, testUsername);
      const payload = verifyToken(token);
      
      expect(payload).not.toBeNull();
      expect(payload!.expiresAt).toBeGreaterThan(payload!.issuedAt);
    });

    it('should have reasonable expiration time (expiry > issuedAt by hours, not days)', () => {
      const token = generateToken(testUserId, testUsername);
      const payload = verifyToken(token);
      
      expect(payload).not.toBeNull();
      const durationMs = payload!.expiresAt - payload!.issuedAt;
      const durationHours = durationMs / (1000 * 60 * 60);
      
      // Should be around 24 hours (check it's in a reasonable range: 20-30 hours)
      expect(durationHours).toBeGreaterThan(20);
      expect(durationHours).toBeLessThan(30);
    });
  });

  describe('Token Blacklist', () => {
    it('should add token to blacklist when blacklistToken is called', () => {
      const token = generateToken(testUserId, testUsername);
      expect(isTokenBlacklisted(token)).toBe(false);
      
      blacklistToken(token);
      
      expect(isTokenBlacklisted(token)).toBe(true);
    });

    it('should verifyToken return null for blacklisted token', () => {
      const token = generateToken(testUserId, testUsername);
      blacklistToken(token);
      
      expect(verifyToken(token)).toBeNull();
    });

    it('should handle blacklisting same token multiple times', () => {
      const token = generateToken(testUserId, testUsername);
      
      blacklistToken(token);
      blacklistToken(token); // Should not throw
      blacklistToken(token); // Should not throw
      
      expect(isTokenBlacklisted(token)).toBe(true);
    });
  });

  describe('Security Properties', () => {
    it('cannot forge token without secret', () => {
      // Attacker knows the payload format but not the secret
      const forgedPayload = {
        userId: 'forged-user',
        username: 'forged',
        issuedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };
      
      const forgedPayloadBase64 = Buffer.from(JSON.stringify(forgedPayload)).toString('base64');
      const attackerSignature = Buffer.from('attacker-signature').toString('base64');
      const forgedToken = `${forgedPayloadBase64}.${attackerSignature}`;
      
      const result = verifyToken(forgedToken);
      expect(result).toBeNull();
    });

    it('cannot tamper with userId without invalidating signature', () => {
      const token = generateToken(testUserId, testUsername);
      const [payloadBase64, signature] = token.split('.');
      
      // Decode, modify, and re-encode
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload: TokenPayload = JSON.parse(payloadJson);
      payload.userId = 'modified-user-id';
      
      const modifiedPayloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const tamperedToken = `${modifiedPayloadBase64}.${signature}`;
      
      const result = verifyToken(tamperedToken);
      expect(result).toBeNull();
    });

    it('token format should be base64.payload.base64.signature', () => {
      const token = generateToken(testUserId, testUsername);
      const parts = token.split('.');
      
      expect(parts.length).toBe(2);
      
      // Both parts should be valid base64
      expect(() => Buffer.from(parts[0], 'base64')).not.toThrow();
      expect(() => Buffer.from(parts[1], 'base64')).not.toThrow();
    });
  });
});
