import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUser } from './admin-user.entity';

@Injectable()
export class AdminUsersService {
  constructor(@InjectRepository(AdminUser, 'adminDb') private readonly admins: Repository<AdminUser>) {}

  findByEmail(email: string): Promise<AdminUser | null> {
    return this.admins.findOne({ where: { email } });
  }

  findById(id: string): Promise<AdminUser | null> {
    return this.admins.findOne({ where: { id } });
  }
}
