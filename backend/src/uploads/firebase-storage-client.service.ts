import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { getApp, getApps, initializeApp, cert } from 'firebase-admin/app';
import { getStorage, getDownloadURL } from 'firebase-admin/storage';
import type { Bucket } from '@google-cloud/storage';

/**
 * Thin wrapper around firebase-admin's Storage API — same isConfigured()-
 * gated shape as RazorpayClientService/GeminiClientService/PorterClientService.
 * Callers (UploadsService) check isConfigured() and fall back to local disk
 * when false.
 *
 * Public-URL strategy: set a firebaseStorageDownloadTokens metadata token at
 * upload time, then resolve the URL via firebase-admin/storage's own
 * getDownloadURL() (confirmed against the installed package's source —
 * it builds exactly this URL from that same metadata field, so this isn't
 * a hand-rolled convention, it's the SDK's documented mechanism). Chosen
 * over bucket.file().makePublic() (fails outright on the
 * Uniform-Bucket-Level-Access default Google now uses for new buckets) and
 * over signed URLs (GCS caps V4 signed URLs at 7 days — too short for a URL
 * stored permanently in a DB column).
 */
@Injectable()
export class FirebaseStorageClientService {
  private bucket?: Bucket;

  constructor(config: ConfigService) {
    const bucketName = config.get<string>('FIREBASE_STORAGE_BUCKET') || undefined;
    const credentialsB64 = config.get<string>('FIREBASE_SERVICE_ACCOUNT_B64') || undefined;
    if (!bucketName || !credentialsB64) return;

    const serviceAccount = JSON.parse(Buffer.from(credentialsB64, 'base64').toString('utf-8'));
    // Guard against "Firebase App named '[DEFAULT]' already exists" if this
    // ever gets constructed twice in one process (e.g. test runs).
    const app = getApps().length ? getApp() : initializeApp({ credential: cert(serviceAccount), storageBucket: bucketName });
    this.bucket = getStorage(app).bucket();
  }

  isConfigured(): boolean {
    return !!this.bucket;
  }

  async upload(objectPath: string, buffer: Buffer, contentType: string): Promise<string> {
    if (!this.bucket) {
      throw new Error('FirebaseStorageClientService: not configured (missing FIREBASE_STORAGE_BUCKET/FIREBASE_SERVICE_ACCOUNT_B64)');
    }
    const token = randomUUID();
    const file = this.bucket.file(objectPath);
    await file.save(buffer, {
      metadata: { contentType, metadata: { firebaseStorageDownloadTokens: token } },
    });
    return getDownloadURL(file);
  }
}
