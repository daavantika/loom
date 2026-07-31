import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationCase } from './moderation-case.entity';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';
import { VerificationModule } from '../verification/verification.module';
import { CooksModule } from '../cooks/cooks.module';

@Module({
  imports: [TypeOrmModule.forFeature([ModerationCase], 'adminDb'), VerificationModule, CooksModule],
  providers: [ModerationService],
  controllers: [ModerationController],
  exports: [ModerationService],
})
export class ModerationModule {}
