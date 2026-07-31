import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatusEvent } from './order-status-event.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CustomersModule } from '../customers/customers.module';
import { CooksModule } from '../cooks/cooks.module';
import { MenuModule } from '../menu/menu.module';
import { VerificationModule } from '../verification/verification.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderStatusEvent], 'userDb'),
    CustomersModule,
    CooksModule,
    MenuModule,
    VerificationModule,
    PaymentsModule,
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
