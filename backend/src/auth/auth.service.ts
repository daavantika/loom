import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AdminUsersService } from '../admin-users/admin-users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly adminUsers: AdminUsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('An account with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.users.create(dto.email, passwordHash, dto.role);
    return this.issueToken(user.id, user.email, user.role);
  }

  /**
   * Single login endpoint spanning both DBs: try the user DB (cook/customer)
   * first, fall back to the admin DB on a miss. A separate /admin/auth/login
   * would leak which emails are admin accounts by its mere existence.
   */
  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    if (user) {
      const valid = await bcrypt.compare(dto.password, user.passwordHash);
      if (!valid) throw new UnauthorizedException('Invalid email or password');
      return this.issueToken(user.id, user.email, user.role);
    }

    const admin = await this.adminUsers.findByEmail(dto.email);
    if (admin) {
      const valid = await bcrypt.compare(dto.password, admin.passwordHash);
      if (!valid) throw new UnauthorizedException('Invalid email or password');
      return this.issueToken(admin.id, admin.email, admin.role);
    }

    throw new UnauthorizedException('Invalid email or password');
  }

  private issueToken(userId: string, email: string, role: string) {
    const accessToken = this.jwt.sign({ sub: userId, email, role });
    return { accessToken, userId, email, role };
  }
}
