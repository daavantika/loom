import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { writeFile } from 'fs/promises';
import type { Request } from 'express';
import { SupabaseStorageClientService } from './supabase-storage-client.service';
import { UPLOADS_DIR } from './uploads.constants';

/**
 * Owns the Supabase-vs-local-disk decision for where an uploaded file ends
 * up — mirrors DeliveryService checking PorterClientService.isConfigured()
 * before deciding to dispatch vs. record SKIPPED. Local disk is the
 * automatic fallback whenever Supabase isn't configured, so `start:dev` and
 * e2e tests need zero Supabase credentials.
 */
@Injectable()
export class UploadsService {
  constructor(private readonly supabase: SupabaseStorageClientService) {}

  async store(file: Express.Multer.File, req: Request): Promise<string> {
    const filename = `${randomUUID()}${extname(file.originalname)}`;
    if (this.supabase.isConfigured()) {
      return this.supabase.upload(`uploads/${filename}`, file.buffer, file.mimetype);
    }
    await writeFile(join(UPLOADS_DIR, filename), file.buffer);
    // Absolute URL, never relative — SaveOnboardingDto.photoUrls / SaveMenuItemDto.imageUrl validate with @IsUrl().
    return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
  }
}
