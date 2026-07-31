import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/order.entity';
import { CooksModule } from '../cooks/cooks.module';
import { VerificationModule } from '../verification/verification.module';
import { RazorpayClientService } from './razorpay-client.service';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order], 'userDb'), CooksModule, VerificationModule],
  providers: [RazorpayClientService, PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
