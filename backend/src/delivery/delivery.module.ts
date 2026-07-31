import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryBooking } from './delivery-booking.entity';
import { PorterClientService } from './porter-client.service';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { CooksModule } from '../cooks/cooks.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryBooking], 'userDb'), CooksModule, OrdersModule],
  providers: [PorterClientService, DeliveryService],
  controllers: [DeliveryController],
  exports: [DeliveryService],
})
export class DeliveryModule {}
