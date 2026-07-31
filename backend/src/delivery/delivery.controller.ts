import { BadRequestException, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { DeliveryService } from './delivery.service';
import { PorterClientService } from './porter-client.service';
import { DeliveryBookingStatus } from './delivery-booking.entity';

interface PorterWebhookPayload {
  order_id?: string;
  status?: string;
  rider?: { name?: string; phone?: string };
}

// TODO: confirm Porter's real webhook status values against their API docs —
// this mapping is a placeholder until then.
const PORTER_STATUS_MAP: Record<string, DeliveryBookingStatus> = {
  order_assigned: 'RIDER_ASSIGNED',
  order_picked_up: 'PICKED_UP',
  order_completed: 'DELIVERED',
  order_cancelled: 'CANCELLED',
};

@ApiTags('delivery')
@Controller('delivery')
export class DeliveryController {
  constructor(
    private readonly delivery: DeliveryService,
    private readonly porter: PorterClientService,
  ) {}

  /**
   * Public, Porter-signature-verified, idempotent — mirrors
   * PaymentsController.webhook. Always 200s past signature verification so
   * Porter doesn't retry-storm on our own downstream issues.
   * TODO: confirm Porter's real signature header name and payload shape
   * against their API docs; this is scaffolding until then.
   */
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Req() req: Request & { rawBody?: Buffer }) {
    const signature = req.headers['x-porter-signature'];
    if (typeof signature !== 'string' || !req.rawBody) {
      throw new BadRequestException('Missing webhook signature');
    }
    if (!this.porter.verifyWebhookSignature(req.rawBody.toString('utf8'), signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const body = JSON.parse(req.rawBody.toString('utf8')) as PorterWebhookPayload;
    const mappedStatus = body.status ? PORTER_STATUS_MAP[body.status] : undefined;
    if (!body.order_id || !mappedStatus) return { received: true };

    await this.delivery.handleWebhookStatusUpdate({
      porterOrderId: body.order_id,
      status: mappedStatus,
      riderName: body.rider?.name,
      riderPhone: body.rider?.phone,
    });

    return { received: true };
  }
}
