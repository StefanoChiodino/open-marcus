import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { hashRawSync } from '@node-rs/argon2';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;

export interface EncryptedData {
  iv: string;
  authTag: string;
  salt: string;
  ciphertext: string;
}

/**
 * Derives an encryption key from a password using Argon2id
 * 
 * Uses memory-hard, GPU-resistant Argon2id algorithm for key derivation.
 * Same password + same salt produces the same 256-bit key.
 * Different salt produces a different key, enabling password changes.
 * 
 * @param password - The user's password
 * @param salt - A 32-byte salt (should be random and unique per user)
 * @returns A 256-bit key as a Buffer
 */
export function deriveKey(password: string, salt: Buffer): Buffer {
  if (!password) {
    throw new Error('Password cannot be empty');
  }
  
  if (!salt || salt.length !== SALT_LENGTH) {
    throw new Error(`Salt must be ${SALT_LENGTH} bytes`);
  }
  
  const key = hashRawSync(password, {
    salt: salt,
    memoryCost: 65536, // 64 MiB - memory-hard for GPU resistance
    timeCost: 3,       // Number of iterations
    parallelism: 4,    // Number of parallel threads
    outputLen: KEY_LENGTH, // 32 bytes = 256 bits
  });
  
  return key;
}

/**
 * Encrypts plaintext data using AES-256-GCM
 * Returns encrypted data with IV, auth tag, salt, and ciphertext (all base64 encoded)
 */
export function encrypt(plaintext: string, password: string): EncryptedData {
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    salt: salt.toString('base64'),
    ciphertext,
  };
}

/**
 * Decrypts encrypted data using AES-256-GCM
 */
export function decrypt(encrypted: EncryptedData, password: string): string {
  const salt = Buffer.from(encrypted.salt, 'base64');
  const iv = Buffer.from(encrypted.iv, 'base64');
  const authTag = Buffer.from(encrypted.authTag, 'base64');
  const key = deriveKey(password, salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

/**
 * Encrypts an object by JSON-stringifying it first
 */
export function encryptObject<T>(obj: T, password: string): EncryptedData {
  const json = JSON.stringify(obj);
  return encrypt(json, password);
}

/**
 * Decrypts and parses JSON data back into an object
 */
export function decryptObject<T>(encrypted: EncryptedData, password: string): T {
  const json = decrypt(encrypted, password);
  return JSON.parse(json) as T;
}
