import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { AdminUser } from '../admin-users/admin-user.entity';
import { VerificationRecord } from '../verification/verification-record.entity';
import { CookSuspension } from '../verification/cook-suspension.entity';
import { ModerationCase } from '../moderation/moderation-case.entity';

dotenv.config();

export const AdminDataSource = new DataSource({
  type: 'postgres',
  url: process.env.ADMIN_DATABASE_URL,
  entities: [AdminUser, VerificationRecord, CookSuspension, ModerationCase],
  migrations: [__dirname + '/../../migrations/admin-db/*.{ts,js}'],
  synchronize: false,
  logging: false,
});
