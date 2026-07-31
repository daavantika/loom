import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Application-layer envelope encryption for sensitive fields (payout bank/UPI
 * details). Chosen over relying on the Postgres pgcrypto extension so
 * encryption/decryption behaves identically on any Postgres-wire-compatible
 * backend and keeps key management in the app, not the DB.
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const secret = config.getOrThrow<string>('PAYOUT_DETAILS_ENCRYPTION_KEY');
    // Derive a fixed 32-byte key regardless of the raw secret's length.
    this.key = createHash('sha256').update(secret).digest();
  }

  encrypt(plaintext: string): Buffer {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]);
  }

  decrypt(payload: Buffer): string {
    const iv = payload.subarray(0, IV_LENGTH);
    const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + 16);
    const encrypted = payload.subarray(IV_LENGTH + 16);
    const decipher = createDecipheriv(ALGO, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }
}
