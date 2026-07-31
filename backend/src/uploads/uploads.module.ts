import { mkdirSync } from 'fs';
import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { FirebaseStorageClientService } from './firebase-storage-client.service';
import { UPLOADS_DIR } from './uploads.constants';

// Still needed for the local-disk fallback branch (UploadsService writes
// here whenever Firebase isn't configured).
mkdirSync(UPLOADS_DIR, { recursive: true });

@Module({
  providers: [FirebaseStorageClientService, UploadsService],
  controllers: [UploadsController],
})
export class UploadsModule {}
