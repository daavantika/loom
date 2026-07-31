import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CustomersService } from '../customers/customers.service';
import { CooksService } from '../cooks/cooks.service';
import { MenuService } from '../menu/menu.service';
import { VerificationService } from '../verification/verification.service';
import { PaymentsService } from '../payments/payments.service';

function makeOrdersRepo(existing: any[] = []) {
  return {
    create: jest.fn((input) => ({ id: 'order-1', ...input })),
    save: jest.fn(async (entity) => entity),
    findOne: jest.fn(async (opts: any) => existing.find((o) => o.id === opts.where.id) ?? null),
    find: jest.fn(async () => existing),
  };
}

function makeEventsRepo() {
  return {
    create: jest.fn((input) => ({ id: 'event-1', ...input })),
    save: jest.fn(async (entity) => entity),
    find: jest.fn(async () => []),
  };
}

function makeTransactionalDataSource() {
  return {
    transaction: jest.fn(async (cb: any) => cb({ withRepository: (repo: any) => repo })),
  };
}

function makeEventEmitter() {
  return { emit: jest.fn(), emitAsync: jest.fn(async () => []) };
}

const verifiedCook = {
  profile: { id: 'cook-1', minOrderValuePaise: 10000 },
  verification: { verified: true, status: 'VERIFIED' as const },
};

const unverifiedCook = {
  profile: { id: 'cook-1', minOrderValuePaise: 0 },
  verification: { verified: false, status: 'PENDING' as const },
};

const ownedAddress = { id: 'addr-1', customerId: 'customer-1', label: 'Home', addressLine: '1 Main St' };

const menuItems = [
  { id: 'item-1', cookId: 'cook-1', name: 'Dosa', pricePaise: 6000, active: true },
  { id: 'item-2', cookId: 'cook-1', name: 'Idli', pricePaise: 5000, active: true },
];

function makeService(
  overrides: Partial<{
    orders: any;
    events: any;
    customers: any;
    cooks: any;
    menu: any;
    verification: any;
    payments: any;
    emitter: any;
  }> = {},
) {
  const orders = overrides.orders ?? makeOrdersRepo();
  const events = overrides.events ?? makeEventsRepo();
  const emitter = overrides.emitter ?? makeEventEmitter();
  const customers = overrides.customers ?? {
    getOrCreateProfile: jest.fn(async () => ({ id: 'customer-1' })),
    getOwnedAddress: jest.fn(async () => ownedAddress),
  };
  const cooks = overrides.cooks ?? {
    getPublicProfile: jest.fn(async () => verifiedCook),
    getMyProfile: jest.fn(async () => ({ id: 'cook-1' })),
  };
  const menu = overrides.menu ?? {
    getOrderableItems: jest.fn(async () => menuItems),
  };
  const verification = overrides.verification ?? {
    getRazorpayAccountForCook: jest.fn(async () => null),
  };
  const payments = overrides.payments ?? {
    createOrderForCheckout: jest.fn(),
    verifyClientPayment: jest.fn(() => false),
  };
  const service = new OrdersService(
    orders as any,
    events as any,
    makeTransactionalDataSource() as any,
    customers as unknown as CustomersService,
    cooks as unknown as CooksService,
    menu as unknown as MenuService,
    verification as unknown as VerificationService,
    payments as unknown as PaymentsService,
    emitter,
  );
  return { service, orders, events, customers, cooks, menu, verification, payments, emitter };
}

describe('OrdersService.create', () => {
  const dto = {
    cookId: 'cook-1',
    addressId: 'addr-1',
    items: [
      { menuItemId: 'item-1', quantity: 2 },
      { menuItemId: 'item-2', quantity: 1 },
    ],
  };

  it('computes the subtotal from menu-item prices and snapshots line items', async () => {
    const { service, orders, events } = makeService();

    const order = await service.create('user-1', dto);

    // 2 * 6000 + 1 * 5000 = 17000
    expect(order.subtotalPaise).toBe(17000);
    expect(order.totalPaise).toBe(17000);
    expect(order.deliveryFeePaise).toBe(0);
    expect(order.status).toBe('PLACED');
    expect(order.paymentMethod).toBe('COD');
    expect(order.paymentStatus).toBe('COD');
    expect(order.razorpay).toBeUndefined();
    expect(orders.create).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({ menuItemId: 'item-1', name: 'Dosa', pricePaise: 6000, quantity: 2, lineTotalPaise: 12000 }),
          expect.objectContaining({ menuItemId: 'item-2', name: 'Idli', pricePaise: 5000, quantity: 1, lineTotalPaise: 5000 }),
        ],
      }),
    );
    expect(events.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PLACED', actorUserId: 'user-1' }),
    );
  });

  it('rejects placing an order against an unverified cook', async () => {
    const { service } = makeService({ cooks: { getPublicProfile: jest.fn(async () => unverifiedCook), getMyProfile: jest.fn() } });

    await expect(service.create('user-1', dto)).rejects.toThrow(BadRequestException);
  });

  it('rejects an order whose subtotal is below the minimum order value', async () => {
    const belowMinCook = { profile: { id: 'cook-1', minOrderValuePaise: 999999 }, verification: { verified: true, status: 'VERIFIED' as const } };
    const { service } = makeService({ cooks: { getPublicProfile: jest.fn(async () => belowMinCook), getMyProfile: jest.fn() } });

    await expect(service.create('user-1', dto)).rejects.toThrow(BadRequestException);
  });

  it('propagates rejection when an item belongs to a different cook or is inactive', async () => {
    const { service } = makeService({
      menu: { getOrderableItems: jest.fn().mockRejectedValue(new BadRequestException('bad items')) },
    });

    await expect(service.create('user-1', dto)).rejects.toThrow(BadRequestException);
  });

  it("400s cleanly when paymentMethod is ONLINE but the cook has no Razorpay linked account (e.g. payments not configured yet)", async () => {
    const { service, payments } = makeService({
      verification: { getRazorpayAccountForCook: jest.fn(async () => null) },
    });

    await expect(service.create('user-1', { ...dto, paymentMethod: 'ONLINE' })).rejects.toThrow(BadRequestException);
    expect(payments.createOrderForCheckout).not.toHaveBeenCalled();
  });

  it('creates a Razorpay order and returns checkout details when paymentMethod is ONLINE and the cook is payout-ready', async () => {
    const { service, orders } = makeService({
      verification: { getRazorpayAccountForCook: jest.fn(async () => 'acc_cook1') },
      payments: {
        createOrderForCheckout: jest.fn(async () => ({
          razorpayOrderId: 'order_razorpay1',
          amountPaise: 17000,
          keyId: 'rzp_test_key',
          platformFeePaise: 850,
          cookPayoutPaise: 16150,
        })),
        verifyClientPayment: jest.fn(() => false),
      },
    });

    const order = await service.create('user-1', { ...dto, paymentMethod: 'ONLINE' });

    expect(order.paymentMethod).toBe('ONLINE');
    expect(order.paymentStatus).toBe('PENDING');
    expect(order.platformFeePaise).toBe(850);
    expect(order.cookPayoutPaise).toBe(16150);
    expect(order.razorpay).toEqual({ orderId: 'order_razorpay1', amountPaise: 17000, keyId: 'rzp_test_key' });
    expect(orders.create).toHaveBeenCalledWith(expect.objectContaining({ razorpayOrderId: 'order_razorpay1' }));
  });
});

// Every account is CUSTOMER-role regardless of whether it also has a
// verified kitchen (see CooksController's comment on why), so perspective is
// resolved by actual profile ownership against the order, not by a role
// string — these mocks simulate "does this caller have a cook profile that
// owns this order" independently of "does their customer profile own it".
function makeNoCookProfile() {
  return jest.fn().mockRejectedValue(new NotFoundException('Cook profile not found'));
}

describe('OrdersService.updateStatus', () => {
  it('lets the owning cook advance PLACED to ACCEPTED', async () => {
    const order = { id: 'order-1', status: 'PLACED', cookId: 'cook-1', customerId: 'customer-1' };
    const { service } = makeService({ orders: makeOrdersRepo([order]) });

    const result = await service.updateStatus('user-1', 'order-1', { status: 'ACCEPTED' } as any);

    expect(result.status).toBe('ACCEPTED');
  });

  it('rejects the cook skipping straight from PLACED to PREPARING', async () => {
    const order = { id: 'order-1', status: 'PLACED', cookId: 'cook-1', customerId: 'customer-1' };
    const { service } = makeService({ orders: makeOrdersRepo([order]) });

    await expect(service.updateStatus('user-1', 'order-1', { status: 'PREPARING' } as any)).rejects.toThrow(BadRequestException);
  });

  it('lets the customer cancel while PLACED', async () => {
    const order = { id: 'order-1', status: 'PLACED', cookId: 'cook-1', customerId: 'customer-1' };
    const { service } = makeService({
      orders: makeOrdersRepo([order]),
      cooks: { getPublicProfile: jest.fn(), getMyProfile: makeNoCookProfile() },
    });

    const result = await service.updateStatus('user-1', 'order-1', { status: 'CANCELLED' } as any);

    expect(result.status).toBe('CANCELLED');
  });

  it('refuses the customer cancelling once the cook has accepted', async () => {
    const order = { id: 'order-1', status: 'ACCEPTED', cookId: 'cook-1', customerId: 'customer-1' };
    const { service } = makeService({
      orders: makeOrdersRepo([order]),
      cooks: { getPublicProfile: jest.fn(), getMyProfile: makeNoCookProfile() },
    });

    await expect(service.updateStatus('user-1', 'order-1', { status: 'CANCELLED' } as any)).rejects.toThrow(BadRequestException);
  });

  it('404s (not 403) when the caller is neither the customer nor the cook on the order', async () => {
    const order = { id: 'order-1', status: 'PLACED', cookId: 'cook-1', customerId: 'customer-1' };
    const { service } = makeService({
      orders: makeOrdersRepo([order]),
      cooks: { getPublicProfile: jest.fn(), getMyProfile: makeNoCookProfile() },
      customers: {
        getOrCreateProfile: jest.fn(async () => ({ id: 'someone-elses-customer-profile' })),
        getOwnedAddress: jest.fn(),
      },
    });

    await expect(service.updateStatus('other-user', 'order-1', { status: 'CANCELLED' } as any)).rejects.toThrow(NotFoundException);
  });

  it('emits ORDER_READY_FOR_PICKUP (awaited via emitAsync) when the cook moves PREPARING to OUT_FOR_DELIVERY', async () => {
    const order = {
      id: 'order-1',
      status: 'PREPARING',
      cookId: 'cook-1',
      customerId: 'customer-1',
      deliveryLat: 11.1,
      deliveryLng: 77.1,
      deliveryAddressLine: '1 Customer St',
    };
    const { service, emitter } = makeService({ orders: makeOrdersRepo([order]) });

    await service.updateStatus('user-1', 'order-1', { status: 'OUT_FOR_DELIVERY' } as any);

    expect(emitter.emitAsync).toHaveBeenCalledWith(
      'order.ready_for_pickup',
      expect.objectContaining({ orderId: 'order-1', cookId: 'cook-1', dropLat: 11.1, dropLng: 77.1 }),
    );
  });

  it('does not emit ORDER_READY_FOR_PICKUP for other transitions', async () => {
    const order = { id: 'order-1', status: 'PLACED', cookId: 'cook-1', customerId: 'customer-1' };
    const { service, emitter } = makeService({ orders: makeOrdersRepo([order]) });

    await service.updateStatus('user-1', 'order-1', { status: 'ACCEPTED' } as any);

    expect(emitter.emitAsync).not.toHaveBeenCalled();
  });
});

describe('OrdersService.markDeliveredFromWebhook', () => {
  it('is a no-op when the order is not currently OUT_FOR_DELIVERY (idempotent)', async () => {
    const order = { id: 'order-1', status: 'DELIVERED', cookId: 'cook-1', customerId: 'customer-1' };
    const { service, orders } = makeService({ orders: makeOrdersRepo([order]) });

    await service.markDeliveredFromWebhook('order-1');

    expect(orders.save).not.toHaveBeenCalled();
  });

  it('is a no-op when the order does not exist', async () => {
    const { service, orders } = makeService({ orders: makeOrdersRepo([]) });

    await service.markDeliveredFromWebhook('nonexistent');

    expect(orders.save).not.toHaveBeenCalled();
  });

  it('marks an OUT_FOR_DELIVERY order DELIVERED and records the event against the cook', async () => {
    const order = { id: 'order-1', status: 'OUT_FOR_DELIVERY', cookId: 'cook-1', customerId: 'customer-1' };
    const { service, orders, events } = makeService({
      orders: makeOrdersRepo([order]),
      cooks: { getPublicProfile: jest.fn(async () => ({ profile: { userId: 'cook-owner-1' } })), getMyProfile: jest.fn() },
    });

    await service.markDeliveredFromWebhook('order-1');

    expect(orders.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'DELIVERED' }));
    expect(events.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'DELIVERED', actorUserId: 'cook-owner-1' }));
  });
});

describe('OrdersService.getById', () => {
  it('404s when the order does not exist', async () => {
    const { service } = makeService({ orders: makeOrdersRepo([]) });

    await expect(service.getById('user-1', 'nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('returns the order with its status history for the owning customer', async () => {
    const order = { id: 'order-1', status: 'PLACED', cookId: 'cook-1', customerId: 'customer-1', items: [] };
    const events = { ...makeEventsRepo(), find: jest.fn(async () => [{ status: 'PLACED' }]) };
    const { service } = makeService({
      orders: makeOrdersRepo([order]),
      events,
      cooks: { getPublicProfile: jest.fn(), getMyProfile: makeNoCookProfile() },
    });

    const result = await service.getById('user-1', 'order-1');

    expect(result.order.id).toBe('order-1');
    expect(result.statusHistory).toHaveLength(1);
  });

  it('also resolves for the owning cook, even though their JWT role is CUSTOMER like everyone else', async () => {
    const order = { id: 'order-1', status: 'PLACED', cookId: 'cook-1', customerId: 'customer-1', items: [] };
    const { service } = makeService({ orders: makeOrdersRepo([order]) });

    const result = await service.getById('user-1', 'order-1');

    expect(result.order.id).toBe('order-1');
  });
});

describe('OrdersService.verifyPayment', () => {
  // A fresh object per test — verifyPayment mutates the order it loads
  // in-place, so sharing one literal across tests would leak state between
  // them (the mock repo's findOne returns the exact same reference).
  function makeOnlineOrder(overrides: Partial<any> = {}) {
    return {
      id: 'order-1',
      status: 'PLACED',
      cookId: 'cook-1',
      customerId: 'customer-1',
      paymentMethod: 'ONLINE',
      paymentStatus: 'PENDING',
      razorpayOrderId: 'order_razorpay1',
      ...overrides,
    };
  }

  it('marks the order PAID when the signature is valid', async () => {
    const { service } = makeService({
      orders: makeOrdersRepo([makeOnlineOrder()]),
      cooks: { getPublicProfile: jest.fn(), getMyProfile: makeNoCookProfile() },
      payments: { createOrderForCheckout: jest.fn(), verifyClientPayment: jest.fn(() => true) },
    });

    const result = await service.verifyPayment('user-1', 'order-1', { razorpayPaymentId: 'pay_1', razorpaySignature: 'sig' });

    expect(result.paymentStatus).toBe('PAID');
    expect(result.razorpayPaymentId).toBe('pay_1');
  });

  it('throws (and does not touch paymentStatus) when the signature is invalid — never marks FAILED from this endpoint', async () => {
    const order = makeOnlineOrder();
    const { service } = makeService({
      orders: makeOrdersRepo([order]),
      cooks: { getPublicProfile: jest.fn(), getMyProfile: makeNoCookProfile() },
      payments: { createOrderForCheckout: jest.fn(), verifyClientPayment: jest.fn(() => false) },
    });

    await expect(
      service.verifyPayment('user-1', 'order-1', { razorpayPaymentId: 'pay_1', razorpaySignature: 'bad-sig' }),
    ).rejects.toThrow(BadRequestException);
    expect(order.paymentStatus).toBe('PENDING');
  });

  it('rejects verifying a COD order', async () => {
    const codOrder = makeOnlineOrder({ paymentMethod: 'COD', paymentStatus: 'COD' });
    const { service } = makeService({
      orders: makeOrdersRepo([codOrder]),
      cooks: { getPublicProfile: jest.fn(), getMyProfile: makeNoCookProfile() },
    });

    await expect(
      service.verifyPayment('user-1', 'order-1', { razorpayPaymentId: 'pay_1', razorpaySignature: 'sig' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('404s when the caller is not the customer on the order', async () => {
    const { service } = makeService({
      orders: makeOrdersRepo([makeOnlineOrder()]),
      cooks: { getPublicProfile: jest.fn(), getMyProfile: makeNoCookProfile() },
      customers: {
        getOrCreateProfile: jest.fn(async () => ({ id: 'someone-elses-customer-profile' })),
        getOwnedAddress: jest.fn(),
      },
    });

    await expect(
      service.verifyPayment('other-user', 'order-1', { razorpayPaymentId: 'pay_1', razorpaySignature: 'sig' }),
    ).rejects.toThrow(NotFoundException);
  });
});
