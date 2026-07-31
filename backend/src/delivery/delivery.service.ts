import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { DeliveryBooking, DeliveryBookingStatus } from './delivery-booking.entity';
import { PorterClientService } from './porter-client.service';
import { ORDER_READY_FOR_PICKUP, OrderReadyForPickupEvent } from './delivery.events';
import { CooksService } from '../cooks/cooks.service';
import { OrdersService } from '../orders/orders.service';

// Once a booking reaches one of these, further webhook updates are no-ops —
// mirrors PaymentsController.webhook's "only ever moves forward" idempotency.
const TERMINAL_STATUSES: DeliveryBookingStatus[] = ['DELIVERED', 'CANCELLED'];

export interface PorterWebhookStatusUpdate {
  porterOrderId: string;
  status: DeliveryBookingStatus;
  riderName?: string;
  riderPhone?: string;
}

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    @InjectRepository(DeliveryBooking, 'userDb') private readonly bookings: Repository<DeliveryBooking>,
    private readonly porter: PorterClientService,
    private readonly cooks: CooksService,
    private readonly orders: OrdersService,
  ) {}

  /**
   * Best-effort side effect of a cook marking an order ready — mirrors
   * PaymentsService.handleVerificationApproved: every failure path here only
   * logs and records booking.status, never surfaces as a failed status
   * update (a Porter outage must never block a cook from marking food
   * ready). Coordinates are validated before calling Porter since both
   * CookProfile.lat/lng and Order.deliveryLat/deliveryLng are nullable today.
   */
  @OnEvent(ORDER_READY_FOR_PICKUP)
  async handleOrderReadyForPickup(event: OrderReadyForPickupEvent): Promise<void> {
    const { profile: cook } = await this.cooks.getPublicProfile(event.cookId);

    const booking = this.bookings.create({
      orderId: event.orderId,
      status: 'PENDING',
      pickupLat: cook.lat,
      pickupLng: cook.lng,
      dropLat: event.dropLat,
      dropLng: event.dropLng,
    });

    if (cook.lat == null || cook.lng == null || event.dropLat == null || event.dropLng == null) {
      booking.status = 'SKIPPED';
      booking.failureReason = 'Missing pickup or drop coordinates';
      await this.bookings.save(booking);
      this.logger.warn(`Order ${event.orderId} ready for pickup but missing coordinates — skipping Porter dispatch`);
      return;
    }

    if (!this.porter.isConfigured()) {
      booking.status = 'SKIPPED';
      booking.failureReason = 'Porter not configured';
      await this.bookings.save(booking);
      return;
    }

    try {
      const result = await this.porter.createPickup({
        orderId: event.orderId,
        pickupLat: cook.lat,
        pickupLng: cook.lng,
        pickupAddress: cook.addressLine,
        dropLat: event.dropLat,
        dropLng: event.dropLng,
        dropAddress: event.dropAddressLine,
      });
      booking.status = 'BOOKED';
      booking.porterOrderId = result.porterOrderId;
      booking.trackingUrl = result.trackingUrl;
      await this.bookings.save(booking);
    } catch (err) {
      booking.status = 'FAILED';
      booking.failureReason = (err as Error).message;
      await this.bookings.save(booking);
      this.logger.error(`Porter dispatch failed for order ${event.orderId}: ${(err as Error).message}`);
    }
  }

  /**
   * Applies a Porter delivery-status callback. Idempotent: an unknown
   * porterOrderId or an already-terminal booking is a safe no-op, mirroring
   * PaymentsController.webhook. A DELIVERED update also drives the order's
   * own status via OrdersService.markDeliveredFromWebhook.
   */
  async handleWebhookStatusUpdate(update: PorterWebhookStatusUpdate): Promise<void> {
    const booking = await this.bookings.findOne({ where: { porterOrderId: update.porterOrderId } });
    if (!booking || TERMINAL_STATUSES.includes(booking.status)) return;

    booking.status = update.status;
    if (update.riderName) booking.riderName = update.riderName;
    if (update.riderPhone) booking.riderPhone = update.riderPhone;
    await this.bookings.save(booking);

    if (update.status === 'DELIVERED') {
      await this.orders.markDeliveredFromWebhook(booking.orderId);
    }
  }
}
