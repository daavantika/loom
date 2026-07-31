import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserRole } from '../auth/role';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User, 'userDb') private readonly users: Repository<User>) {}

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  create(email: string, passwordHash: string, role: Exclude<UserRole, 'ADMIN'>): Promise<User> {
    return this.users.save(this.users.create({ email, passwordHash, role }));
  }
}
