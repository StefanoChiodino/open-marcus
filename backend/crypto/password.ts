/**
 * Password hashing using Argon2id
 * 
 * This module provides secure password hashing and verification using Argon2id,
 * a memory-hard, GPU-resistant password hashing algorithm.
 * 
 * Key properties:
 * - Hash format includes salt and parameters (self-contained)
 * - Timing-safe comparison for verification
 * - Never logs passwords or password attempts
 */

import * as argon2 from 'argon2';

/**
 * Hash a password using Argon2id
 * 
 * @param password - The plaintext password to hash
 * @returns The argon2id hash string (includes salt and parameters)
 * @throws Error if hashing fails
 */
export async function hash(password: string): Promise<string> {
  if (!password) {
    throw new Error('Password cannot be empty');
  }
  
  const hashResult = await argon2.hash(password, {
    type: argon2.argon2id,
    // Memory cost in KiB (64 MiB)
    memoryCost: 64 * 1024,
    // Number of iterations (time cost)
    timeCost: 3,
    // Parallelism (number of threads)
    parallelism: 4,
  });
  
  return hashResult;
}

/**
 * Verify a password against an argon2id hash
 * 
 * Uses timing-safe comparison to prevent timing attacks.
 * 
 * @param hash - The argon2id hash to verify against
 * @param password - The plaintext password to verify
 * @returns true if the password matches the hash, false otherwise
 */
export async function verify(hash: string, password: string): Promise<boolean> {
  if (!hash || !password) {
    return false;
  }
  
  try {
    // argon2.verify uses timing-safe comparison internally
    const result = await argon2.verify(hash, password);
    return result;
  } catch {
    // Verification failed (invalid hash format, etc.)
    return false;
  }
}
