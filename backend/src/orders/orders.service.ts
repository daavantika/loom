import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { OrderStatusEvent } from './order-status-event.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { VerifyPaymentDto } from '../payments/dto/verify-payment.dto';
import { CustomersService } from '../customers/customers.service';
import { CooksService } from '../cooks/cooks.service';
import { MenuService } from '../menu/menu.service';
import { VerificationService } from '../verification/verification.service';
import { PaymentsService } from '../payments/payments.service';
import { ORDER_READY_FOR_PICKUP, OrderReadyForPickupEvent } from '../delivery/delivery.events';

const COOK_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

// Once a cook has accepted, the customer can no longer unilaterally cancel.
const CUSTOMER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ['CANCELLED'],
  ACCEPTED: [],
  PREPARING: [],
  OUT_FOR_DELIVERY: [],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order, 'userDb') private readonly orders: Repository<Order>,
    @InjectRepository(OrderStatusEvent, 'userDb') private readonly statusEvents: Repository<OrderStatusEvent>,
    @InjectDataSource('userDb') private readonly dataSource: DataSource,
    private readonly customers: CustomersService,
    private readonly cooks: CooksService,
    private readonly menu: MenuService,
    private readonly verification: VerificationService,
    private readonly payments: PaymentsService,
    private readonly events: EventEmitter2,
  ) {}

  async create(userId: string, dto: CreateOrderDto): Promise<Order & { razorpay?: { orderId: string; amountPaise: number; keyId: string } }> {
    const customer = await this.customers.getOrCreateProfile(userId);

    const { profile: cookProfile, verification } = await this.cooks.getPublicProfile(dto.cookId);
    if (!verification.verified) {
      throw new BadRequestException('This kitchen is not currently verified and cannot accept orders');
    }

    const address = await this.customers.getOwnedAddress(userId, dto.addressId);

    const menuItems = await this.menu.getOrderableItems(
      cookProfile.id,
      dto.items.map((i) => i.menuItemId),
    );
    const menuItemsById = new Map(menuItems.map((item) => [item.id, item]));

    const lineItems = dto.items.map((input) => {
      const menuItem = menuItemsById.get(input.menuItemId)!;
      return {
        menuItemId: menuItem.id,
        name: menuItem.name,
        pricePaise: menuItem.pricePaise,
        quantity: input.quantity,
        lineTotalPaise: menuItem.pricePaise * input.quantity,
      };
    });
    const subtotalPaise = lineItems.reduce((sum, item) => sum + item.lineTotalPaise, 0);

    if (subtotalPaise < cookProfile.minOrderValuePaise) {
      throw new BadRequestException(
        `Order subtotal (${subtotalPaise} paise) is below this kitchen's minimum order value (${cookProfile.minOrderValuePaise} paise)`,
      );
    }

    const paymentMethod = dto.paymentMethod ?? 'COD';
    const totalPaise = subtotalPaise;

    // Online payments: talk to Razorpay BEFORE opening the DB transaction —
    // external I/O shouldn't hold a transaction/lock open. The order's id is
    // generated here (rather than left to the DB default) so it can be
    // threaded through as the Razorpay receipt and the row can be inserted
    // with razorpayOrderId already set, all in one insert.
    let razorpay: { orderId: string; amountPaise: number; keyId: string } | undefined;
    let platformFeePaise: number | undefined;
    let cookPayoutPaise: number | undefined;
    const orderId = randomUUID();

    if (paymentMethod === 'ONLINE') {
      const razorpayAccountId = await this.verification.getRazorpayAccountForCook(cookProfile.id);
      if (!razorpayAccountId) {
        throw new BadRequestException('Online payments are not set up for this kitchen yet');
      }
      const checkout = await this.payments.createOrderForCheckout({ id: orderId, subtotalPaise, totalPaise }, razorpayAccountId);
      razorpay = { orderId: checkout.razorpayOrderId, amountPaise: checkout.amountPaise, keyId: checkout.keyId };
      platformFeePaise = checkout.platformFeePaise;
      cookPayoutPaise = checkout.cookPayoutPaise;
    }

    const order = await this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.withRepository(this.orders);
      const eventsRepo = manager.withRepository(this.statusEvents);

      const saved = await orderRepo.save(
        orderRepo.create({
          id: orderId,
          customerId: customer.id,
          cookId: cookProfile.id,
          deliveryAddressLabel: address.label,
          deliveryAddressLine: address.addressLine,
          deliveryArea: address.area,
          deliveryLat: address.lat,
          deliveryLng: address.lng,
          status: 'PLACED',
          subtotalPaise,
          deliveryFeePaise: 0,
          totalPaise,
          paymentMethod,
          paymentStatus: paymentMethod === 'ONLINE' ? 'PENDING' : 'COD',
          razorpayOrderId: razorpay?.orderId,
          platformFeePaise,
          cookPayoutPaise,
          items: lineItems,
        }),
      );

      await eventsRepo.save(eventsRepo.create({ orderId: saved.id, status: 'PLACED', actorUserId: userId }));

      return saved;
    });

    return razorpay ? { ...order, razorpay } : order;
  }

  /**
   * Client-side checkout confirmation — fast-path UX only. A false result
   * just throws; it never marks the order FAILED (a closed/interrupted
   * checkout isn't proof the payment actually failed). Only the webhook
   * (PaymentsController) is authoritative for FAILED.
   */
  async verifyPayment(userId: string, orderId: string, dto: VerifyPaymentDto): Promise<Order> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    const perspective = await this.resolvePerspective(order, userId);
    if (perspective !== 'CUSTOMER') throw new NotFoundException('Order not found');
    if (order.paymentMethod !== 'ONLINE' || order.paymentStatus !== 'PENDING') {
      throw new BadRequestException('This order is not awaiting an online payment');
    }

    const valid = this.payments.verifyClientPayment(order.razorpayOrderId!, dto.razorpayPaymentId, dto.razorpaySignature);
    if (!valid) throw new BadRequestException('Payment signature could not be verified');

    order.paymentStatus = 'PAID';
    order.razorpayPaymentId = dto.razorpayPaymentId;
    return this.orders.save(order);
  }

  async listMine(userId: string): Promise<Order[]> {
    const customer = await this.customers.getOrCreateProfile(userId);
    return this.orders.find({ where: { customerId: customer.id }, relations: ['items'], order: { createdAt: 'DESC' } });
  }

  async listForCook(userId: string): Promise<Order[]> {
    const cook = await this.cooks.getMyProfile(userId);
    return this.orders.find({ where: { cookId: cook.id }, relations: ['items'], order: { createdAt: 'DESC' } });
  }

  /**
   * Resolves which SIDE of this order the caller is — by checking actual
   * ownership of the cook/customer profile against the order, not by
   * trusting the JWT `role` claim. `role` is fixed at registration and every
   * self-registered account is CUSTOMER (see CooksController's comment on
   * why cook endpoints also accept CUSTOMER) — a verified cook's JWT still
   * says "CUSTOMER", so role alone can't tell us which side of an order
   * they're acting as. 404 (not 403) if neither side matches — existence
   * isn't revealed to non-parties.
   */
  private async resolvePerspective(order: Order, userId: string): Promise<'COOK' | 'CUSTOMER'> {
    const cook = await this.cooks.getMyProfile(userId).catch(() => null);
    if (cook && cook.id === order.cookId) return 'COOK';

    const customer = await this.customers.getOrCreateProfile(userId);
    if (customer.id === order.customerId) return 'CUSTOMER';

    throw new NotFoundException('Order not found');
  }

  async getById(userId: string, orderId: string): Promise<{ order: Order; statusHistory: OrderStatusEvent[] }> {
    const order = await this.orders.findOne({ where: { id: orderId }, relations: ['items'] });
    if (!order) throw new NotFoundException('Order not found');
    await this.resolvePerspective(order, userId);

    const statusHistory = await this.statusEvents.find({ where: { orderId }, order: { createdAt: 'ASC' } });
    return { order, statusHistory };
  }

  async updateStatus(userId: string, orderId: string, dto: UpdateOrderStatusDto): Promise<Order> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    const perspective = await this.resolvePerspective(order, userId);

    const transitions = perspective === 'COOK' ? COOK_TRANSITIONS : CUSTOMER_TRANSITIONS;
    const allowed = transitions[order.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`Cannot transition from ${order.status} to ${dto.status}`);
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.withRepository(this.orders);
      const eventsRepo = manager.withRepository(this.statusEvents);

      order.status = dto.status;
      const savedOrder = await orderRepo.save(order);
      await eventsRepo.save(
        eventsRepo.create({ orderId: order.id, status: dto.status, actorUserId: userId, note: dto.note }),
      );
      return savedOrder;
    });

    // Emitted after the transaction commits, not from inside it — Porter
    // dispatch is external I/O and shouldn't hold a DB transaction open (same
    // reasoning as why create() calls Razorpay before opening its
    // transaction). emitAsync (not emit) so the response only returns once
    // DeliveryService's best-effort handler has finished — it still never
    // throws out of this call (all failure paths are caught internally and
    // recorded on the booking), so a Porter outage still can't fail this
    // status update. See delivery.events.ts.
    if (dto.status === 'OUT_FOR_DELIVERY') {
      await this.events.emitAsync(ORDER_READY_FOR_PICKUP, {
        orderId: saved.id,
        cookId: saved.cookId,
        actorUserId: userId,
        dropLat: saved.deliveryLat,
        dropLng: saved.deliveryLng,
        dropAddressLine: saved.deliveryAddressLine,
      } satisfies OrderReadyForPickupEvent);
    }

    return saved;
  }

  /**
   * Webhook-driven transition — bypasses the human-caller perspective check
   * in updateStatus() since Porter can't authenticate as a LOOM user.
   * Idempotent: only ever moves OUT_FOR_DELIVERY -> DELIVERED; anything else
   * (already DELIVERED, cancelled, unknown order) is a safe no-op, mirroring
   * PaymentsController.webhook. Recorded against the cook's own user id,
   * since this is exactly the transition a cook would otherwise make by hand
   * once delivery completes.
   */
  async markDeliveredFromWebhook(orderId: string): Promise<void> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order || order.status !== 'OUT_FOR_DELIVERY') return;

    const { profile: cook } = await this.cooks.getPublicProfile(order.cookId);

    await this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.withRepository(this.orders);
      const eventsRepo = manager.withRepository(this.statusEvents);

      order.status = 'DELIVERED';
      await orderRepo.save(order);
      await eventsRepo.save(
        eventsRepo.create({ orderId: order.id, status: 'DELIVERED', actorUserId: cook.userId, note: 'Delivered — confirmed by Porter' }),
      );
    });
  }
}
