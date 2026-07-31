import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Thin wrapper around Supabase Storage's REST API — same isConfigured()-
 * gated shape as RazorpayClientService/GeminiClientService/PorterClientService.
 * Callers (UploadsService) check isConfigured() and fall back to local disk
 * when false. Plain fetch(), no SDK — Supabase's Storage REST surface is
 * simple enough not to need @supabase/supabase-js for this one call, same
 * choice already made for Porter/Gemini in this codebase.
 *
 * Public-URL strategy: Supabase gives a permanent, unsigned public URL
 * (`/storage/v1/object/public/<bucket>/<path>`) for any object in a bucket
 * marked "Public" in the dashboard — no per-object token/signing needed
 * (unlike Firebase's download-token scheme this replaces). Confirmed
 * against Supabase's own Storage docs before implementing.
 */
@Injectable()
export class SupabaseStorageClientService {
  private readonly url?: string;
  private readonly serviceRoleKey?: string;
  private readonly bucket?: string;

  constructor(config: ConfigService) {
    this.url = config.get<string>('SUPABASE_URL') || undefined;
    this.serviceRoleKey = config.get<string>('SUPABASE_SERVICE_ROLE_KEY') || undefined;
    this.bucket = config.get<string>('SUPABASE_STORAGE_BUCKET') || undefined;
  }

  isConfigured(): boolean {
    return !!(this.url && this.serviceRoleKey && this.bucket);
  }

  async upload(objectPath: string, buffer: Buffer, contentType: string): Promise<string> {
    if (!this.url || !this.serviceRoleKey || !this.bucket) {
      throw new Error(
        'SupabaseStorageClientService: not configured (missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/SUPABASE_STORAGE_BUCKET)',
      );
    }

    const res = await fetch(`${this.url}/storage/v1/object/${this.bucket}/${objectPath}`, {
      method: 'POST',
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        'Content-Type': contentType,
        'x-upsert': 'false',
      },
      // Buffer works fine as a fetch body at runtime (Node's undici accepts
      // it natively) — the cast is only needed because @types/node's fetch
      // signature doesn't structurally recognize Buffer as BodyInit.
      body: buffer as BodyInit,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(`Supabase Storage upload failed (${res.status}): ${data?.message ?? res.statusText}`);
    }

    return `${this.url}/storage/v1/object/public/${this.bucket}/${objectPath}`;
  }
}
