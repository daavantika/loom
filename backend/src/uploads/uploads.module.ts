import { mkdirSync } from 'fs';
import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { SupabaseStorageClientService } from './supabase-storage-client.service';
import { UPLOADS_DIR } from './uploads.constants';

// Still needed for the local-disk fallback branch (UploadsService writes
// here whenever Supabase isn't configured).
mkdirSync(UPLOADS_DIR, { recursive: true });

@Module({
  providers: [SupabaseStorageClientService, UploadsService],
  controllers: [UploadsController],
})
export class UploadsModule {}
