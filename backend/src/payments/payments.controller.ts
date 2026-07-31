import { BadRequestException, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { Order, OrderPaymentStatus } from '../orders/order.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

interface RazorpayWebhookPayload {
  event: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string } };
  };
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    @InjectRepository(Order, 'userDb') private readonly orders: Repository<Order>,
  ) {}

  @Get('config')
  getConfig() {
    return this.payments.getPublicConfig();
  }

  /**
   * Public, Razorpay-signature-verified, idempotent. The authority on
   * payment state — see OrdersService.verifyPayment for why the
   * client-confirmation endpoint alone isn't trusted to mark FAILED.
   * Always 200s past signature verification so Razorpay doesn't retry-storm
   * on our own downstream issues (an order we can't find, e.g.).
   */
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Req() req: Request & { rawBody?: Buffer }) {
    const signature = req.headers['x-razorpay-signature'];
    if (typeof signature !== 'string' || !req.rawBody) {
      throw new BadRequestException('Missing webhook signature');
    }
    if (!this.payments.verifyWebhookSignature(req.rawBody.toString('utf8'), signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const body = JSON.parse(req.rawBody.toString('utf8')) as RazorpayWebhookPayload;
    const razorpayOrderId = body.payload?.payment?.entity?.order_id;
    const razorpayPaymentId = body.payload?.payment?.entity?.id;
    if (!razorpayOrderId) return { received: true };

    const nextStatus: OrderPaymentStatus | null =
      body.event === 'payment.captured' ? 'PAID' : body.event === 'payment.failed' ? 'FAILED' : null;
    if (!nextStatus) return { received: true };

    const order = await this.orders.findOne({ where: { razorpayOrderId } });
    // Idempotent: only ever moves an order out of PENDING — a resent webhook
    // for an already-settled order is a safe no-op, never a downgrade.
    if (order && order.paymentStatus === 'PENDING') {
      order.paymentStatus = nextStatus;
      if (razorpayPaymentId) order.razorpayPaymentId = razorpayPaymentId;
      await this.orders.save(order);
    }

    return { received: true };
  }
}
