import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CommonModule } from './common/common.module';
import { UsersModule } from './users/users.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { AuthModule } from './auth/auth.module';
import { CooksModule } from './cooks/cooks.module';
import { CustomersModule } from './customers/customers.module';
import { OrdersModule } from './orders/orders.module';
import { VerificationModule } from './verification/verification.module';
import { ModerationModule } from './moderation/moderation.module';
import { UploadsModule } from './uploads/uploads.module';
import { PaymentsModule } from './payments/payments.module';
import { MessagesModule } from './messages/messages.module';
import { AssistantModule } from './assistant/assistant.module';
import { DeliveryModule } from './delivery/delivery.module';

// PGlite (used as the embedded dev/test Postgres — see scripts/dev-db.ts) only
// multiplexes a single underlying connection per instance, so it's capped at
// 1; a real Postgres (e.g. Neon) can use a normal pool. Detected by URL host
// rather than an env flag, so switching *_DATABASE_URL alone is enough.
function poolFor(url: string): { max: number } {
  const isLocal = /^postgres(?:ql)?:\/\/[^@]+@(127\.0\.0\.1|localhost)[:/]/.test(url);
  return { max: isLocal ? 1 : 5 };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    // Cooks + customers — all cook/customer-facing transactional data.
    TypeOrmModule.forRootAsync({
      name: 'userDb',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.getOrThrow<string>('USER_DATABASE_URL');
        return { name: 'userDb', type: 'postgres', url, autoLoadEntities: true, synchronize: false, extra: poolFor(url) };
      },
    }),
    // Admin accounts + verification/moderation review data. Kept in a
    // separate physical database — never a cached/synced copy of anything
    // from the user DB, and vice versa. See specs/phase-1.5-two-database-split.
    TypeOrmModule.forRootAsync({
      name: 'adminDb',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.getOrThrow<string>('ADMIN_DATABASE_URL');
        return { name: 'adminDb', type: 'postgres', url, autoLoadEntities: true, synchronize: false, extra: poolFor(url) };
      },
    }),
    CommonModule,
    UsersModule,
    AdminUsersModule,
    AuthModule,
    CooksModule,
    CustomersModule,
    OrdersModule,
    VerificationModule,
    ModerationModule,
    UploadsModule,
    PaymentsModule,
    MessagesModule,
    AssistantModule,
    DeliveryModule,
  ],
})
export class AppModule {}
