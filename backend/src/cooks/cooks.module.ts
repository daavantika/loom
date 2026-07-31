import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CookProfile } from './cook-profile.entity';
import { KitchenPhoto } from './kitchen-photo.entity';
import { CooksService } from './cooks.service';
import { CooksController } from './cooks.controller';
import { VerificationModule } from '../verification/verification.module';
import { MenuModule } from '../menu/menu.module';

@Module({
  imports: [TypeOrmModule.forFeature([CookProfile, KitchenPhoto], 'userDb'), VerificationModule, MenuModule],
  providers: [CooksService],
  controllers: [CooksController],
  exports: [CooksService],
})
export class CooksModule {}
