import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationRecord } from './verification-record.entity';
import { CookSuspension } from './cook-suspension.entity';
import { VerificationService } from './verification.service';

@Module({
  imports: [TypeOrmModule.forFeature([VerificationRecord, CookSuspension], 'adminDb')],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
