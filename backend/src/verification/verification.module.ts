import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationRecord } from './verification-record.entity';
import { VerificationService } from './verification.service';

@Module({
  imports: [TypeOrmModule.forFeature([VerificationRecord], 'adminDb')],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
