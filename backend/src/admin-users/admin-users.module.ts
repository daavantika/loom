import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUser } from './admin-user.entity';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminUser], 'adminDb')],
  providers: [AdminUsersService],
  exports: [AdminUsersService, TypeOrmModule],
})
export class AdminUsersModule {}
